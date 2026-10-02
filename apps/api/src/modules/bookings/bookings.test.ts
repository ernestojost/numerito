import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Availability, Booking } from "@numerito/shared";
import { createApp } from "../../app.js";
import { db, sql } from "../../db/client.js";
import { type Agent, ORIGIN, createBusiness, signUp } from "../../test/helpers.js";
import { zonedTime } from "../availability/intervals.js";
import { localDate } from "../availability/service.js";
import { bookingsService, liveBookingsAt } from "./service.js";

const app = createApp({ checkDb: async () => true });
const TZ = "America/Argentina/Buenos_Aires";

let owner: Agent;
let client: Agent;
let business: { id: string; slug: string };
let serviceId: string;
let julio: string;
let marcos: string;
/** Three days ahead, so lead time and the 24 h cancellation window don't get in the way. */
const date = localDate(new Date(Date.now() + 3 * 24 * 3_600_000), TZ);
const at = (hhmm: string) => new Date(zonedTime(date, hhmm, TZ)).toISOString();

const availability = async (staffId?: string) => {
  const res = await request(app)
    .get(`/api/v1/public/businesses/${business.slug}/availability`)
    .query({ serviceId, date, ...(staffId && { staffId }) });
  expect(res.status).toBe(200);
  return res.body as Availability;
};
const startsOf = (a: Availability) => a.slots.map((s) => s.startsAt);
/** No deposit on this service: bookings are confirmed right away (deposits are covered in payments.test.ts). */
const book = async (agent: Agent, startsAt: string, staffId: string | null) => {
  const res = await agent.post("/api/v1/bookings").set("Origin", ORIGIN).send({ businessSlug: business.slug, serviceId, staffId, startsAt });
  return Object.assign(res, { booking: res.body?.booking as Booking });
};

beforeAll(async () => {
  ({ agent: owner } = await signUp(app, "Julio"));
  ({ agent: client } = await signUp(app, "Nico"));
  business = await createBusiness(owner);
  const base = `/api/v1/businesses/${business.id}`;

  serviceId = (
    await owner
      .post(`${base}/services`)
      .set("Origin", ORIGIN)
      .send({ name: "Corte", durationMinutes: 30, bufferMinutes: 10, priceCents: 600000, depositCents: 0 })
  ).body.id;
  julio = (await owner.post(`${base}/staff`).set("Origin", ORIGIN).send({ displayName: "Julio", serviceIds: [serviceId] })).body.id;
  marcos = (await owner.post(`${base}/staff`).set("Origin", ORIGIN).send({ displayName: "Marcos", serviceIds: [serviceId] })).body.id;

  const everyDay = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: "09:00", end: "20:00" }));
  await owner.put(`${base}/hours`).set("Origin", ORIGIN).send(everyDay).expect(200);
});

afterAll(async () => {
  await sql.end();
});

describe("availability", () => {
  it("offers slots on the 15-minute grid for both barbers", async () => {
    const a = await availability();
    expect(a.slots[0]).toMatchObject({ startsAt: at("09:00"), staffIds: expect.arrayContaining([julio, marcos]) });
    expect(a.slots[1]!.startsAt).toBe(at("09:15"));
    // The last start leaves room for 30 min + 10 min cleanup before 20:00.
    expect(a.slots.at(-1)!.startsAt).toBe(at("19:15"));
  });

  it("removes a blocked range for everybody", async () => {
    const res = await owner
      .post(`/api/v1/businesses/${business.id}/overrides`)
      .set("Origin", ORIGIN)
      .send({ startsAt: at("13:00"), endsAt: at("15:00"), reason: "Almuerzo" });
    expect(res.status).toBe(201);
    const starts = startsOf(await availability());
    expect(starts).toContain(at("12:15"));
    expect(starts).not.toContain(at("12:30")); // 12:30 + 40 min runs into the block
    expect(starts).not.toContain(at("14:45"));
    expect(starts).toContain(at("15:00"));
  });
});

describe("booking a slot", () => {
  it("books it and blocks the time plus the cleanup buffer", async () => {
    const res = await book(client, at("09:00"), julio);
    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toBeNull();
    const booking = res.booking;
    expect(booking).toMatchObject({ status: "confirmed", staff: { id: julio }, customer: { name: "Nico" }, depositCents: 0 });
    expect(booking.number).toMatch(/^T-\d{4,}$/);

    const julioStarts = startsOf(await availability(julio));
    // 09:00–09:30 + 10 min cleanup = busy until 09:40.
    expect(julioStarts).not.toContain(at("09:00"));
    expect(julioStarts).not.toContain(at("09:30"));
    expect(julioStarts).toContain(at("09:45"));

    // "Any barber" still offers 09:00, now only with Marcos.
    expect((await availability()).slots[0]).toEqual(expect.objectContaining({ startsAt: at("09:00"), staffIds: [marcos] }));
  });

  it("rejects a time that isn't a free slot", async () => {
    expect((await book(client, at("09:05"), julio)).status).toBe(409);
    expect((await book(client, at("22:00"), julio)).status).toBe(409);
  });

  it("lets exactly one of 20 simultaneous requests take the same slot", async () => {
    const slot = at("10:00");
    const results = await Promise.all(Array.from({ length: 20 }, () => book(client, slot, marcos)));
    const statuses = results.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    expect(results.find((r) => r.status === 409)!.body.code).toBe("SLOT_TAKEN");
    expect(await liveBookingsAt(db, marcos, new Date(slot))).toBe(1);
  });

  it("gives simultaneous 'any barber' requests different barbers, then says the slot is full", async () => {
    const slot = at("11:00");
    const [a, b] = await Promise.all([book(client, slot, null), book(client, slot, null)]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(new Set([a.booking.staff.id, b.booking.staff.id])).toEqual(new Set([julio, marcos]));

    expect((await book(client, slot, null)).status).toBe(409);
  });
});

describe("cancelling", () => {
  it("frees the slot when the client cancels in time", async () => {
    const created = (await book(client, at("16:00"), julio)).booking;
    const res = await client.post(`/api/v1/me/bookings/${created.id}/cancel`).set("Origin", ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled_by_client");
    expect(startsOf(await availability(julio))).toContain(at("16:00"));
  });

  it("refuses to cancel after the cancellation window", async () => {
    const created = (await book(client, at("17:00"), julio)).booking;
    const { user } = (await client.get("/api/auth/get-session")).body;
    const oneHourBefore = new Date(new Date(created.startsAt).getTime() - 3_600_000);
    await expect(bookingsService(db).cancelByClient(user.id, created.id, oneHourBefore)).rejects.toMatchObject({
      status: 403,
      code: "CANCEL_WINDOW_PASSED",
    });
  });

  it("doesn't let another user cancel your booking", async () => {
    const created = (await book(client, at("18:00"), julio)).booking;
    const { agent: stranger } = await signUp(app, "Extraño");
    expect((await stranger.post(`/api/v1/me/bookings/${created.id}/cancel`).set("Origin", ORIGIN)).status).toBe(404);
  });
});

describe("the business side", () => {
  it("lists the day's bookings, adds a manual one and marks it as attended", async () => {
    const base = `/api/v1/businesses/${business.id}/bookings`;
    const manual = await owner
      .post(base)
      .set("Origin", ORIGIN)
      .send({ serviceId, staffId: marcos, startsAt: at("19:00"), customer: { name: "Leo", phone: "+54 9 11 5555-0000" } });
    expect(manual.status).toBe(201);
    expect(manual.body).toMatchObject({ source: "manual", customer: { name: "Leo" }, depositCents: 0 });

    const day = await owner.get(base).query({ from: at("00:00"), to: at("23:59") });
    expect(day.status).toBe(200);
    expect(day.body.map((b: Booking) => b.customer.name)).toContain("Leo");

    const done = await owner.post(`${base}/${manual.body.id}/status`).set("Origin", ORIGIN).send({ status: "completed" });
    expect(done.body.status).toBe("completed");
    const again = await owner.post(`${base}/${manual.body.id}/status`).set("Origin", ORIGIN).send({ status: "no_show" });
    expect(again.status).toBe(409);
  });

  it("offers short-notice slots to the business but not to the public", async () => {
    const today = localDate(new Date(), TZ);
    const query = { serviceId, date: today, staffId: julio };
    const publicSlots = (await request(app).get(`/api/v1/public/businesses/${business.slug}/availability`).query(query)).body.slots;
    const panelSlots = (await owner.get(`/api/v1/businesses/${business.id}/availability`).query(query)).body.slots;
    const soon = Date.now() + 60 * 60_000;
    expect(publicSlots.every((s: { startsAt: string }) => new Date(s.startsAt).getTime() >= soon)).toBe(true);
    expect(panelSlots.length).toBeGreaterThanOrEqual(publicSlots.length);
  });

  it("shows the client their bookings", async () => {
    const mine = (await client.get("/api/v1/me/bookings")).body as Booking[];
    expect(mine.length).toBeGreaterThanOrEqual(5);
    expect(mine.every((b) => b.customer.name === "Nico")).toBe(true);
  });
});
