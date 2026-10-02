import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { db, sql } from "../db/client.js";
import { member } from "../db/schema/index.js";
import { type Agent, ORIGIN, createBusiness, signUp } from "../test/helpers.js";
import { effectiveDeposit } from "../lib/deposit.js";

const app = createApp({ checkDb: async () => true });

let owner: Agent;
let business: { id: string; slug: string };
const base = () => `/api/v1/businesses/${business.id}`;

beforeAll(async () => {
  ({ agent: owner } = await signUp(app));
  business = await createBusiness(owner);
});

afterAll(async () => {
  await sql.end();
});

describe("services", () => {
  it("creates, lists in order and updates services", async () => {
    const corte = await owner
      .post(`${base()}/services`)
      .set("Origin", ORIGIN)
      .send({ name: "Corte", durationMinutes: 30, bufferMinutes: 10, priceCents: 600000 });
    expect(corte.status).toBe(201);
    expect(corte.body).toMatchObject({ name: "Corte", sortOrder: 0, depositCents: null, staffIds: [] });

    await owner
      .post(`${base()}/services`)
      .set("Origin", ORIGIN)
      .send({ name: "Corte + barba", durationMinutes: 45, priceCents: 900000 })
      .expect(201);

    const updated = await owner
      .patch(`${base()}/services/${corte.body.id}`)
      .set("Origin", ORIGIN)
      .send({ priceCents: 650000 });
    expect(updated.body.priceCents).toBe(650000);

    const list = await owner.get(`${base()}/services`);
    expect(list.body.map((s: { name: string }) => s.name)).toEqual(["Corte", "Corte + barba"]);
  });

  it("rejects invalid payloads", async () => {
    const res = await owner.post(`${base()}/services`).set("Origin", ORIGIN).send({ name: "X", durationMinutes: 0 });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty("durationMinutes");
  });
});

describe("staff", () => {
  it("creates a barber linked to services and updates the links", async () => {
    const services = (await owner.get(`${base()}/services`)).body as { id: string }[];
    const julio = await owner
      .post(`${base()}/staff`)
      .set("Origin", ORIGIN)
      .send({ displayName: "Julio", serviceIds: services.map((s) => s.id) });
    expect(julio.status).toBe(201);
    expect(julio.body).toMatchObject({ displayName: "Julio", usesBusinessHours: true });
    expect(julio.body.serviceIds).toHaveLength(2);

    const onlyCorte = await owner
      .patch(`${base()}/staff/${julio.body.id}`)
      .set("Origin", ORIGIN)
      .send({ serviceIds: [services[0]!.id] });
    expect(onlyCorte.body.serviceIds).toEqual([services[0]!.id]);

    const withStaff = (await owner.get(`${base()}/services`)).body as { id: string; staffIds: string[] }[];
    expect(withStaff[0]!.staffIds).toEqual([julio.body.id]);
    expect(withStaff[1]!.staffIds).toEqual([]);
  });

  it("refuses services from another business", async () => {
    const { agent: other } = await signUp(app, "Otro");
    const otherBusiness = await createBusiness(other, "Otra barbería");
    const foreign = await other
      .post(`/api/v1/businesses/${otherBusiness.id}/services`)
      .set("Origin", ORIGIN)
      .send({ name: "Corte", durationMinutes: 30, priceCents: 500000 });

    const res = await owner
      .post(`${base()}/staff`)
      .set("Origin", ORIGIN)
      .send({ displayName: "Marcos", serviceIds: [foreign.body.id] });
    expect(res.status).toBe(400);
  });
});

describe("schedules", () => {
  it("saves split shifts and rejects overlaps", async () => {
    const week = [
      { weekday: 1, start: "09:00", end: "13:00" },
      { weekday: 1, start: "16:00", end: "20:00" },
      { weekday: 6, start: "09:00", end: "14:00" },
    ];
    const saved = await owner.put(`${base()}/hours`).set("Origin", ORIGIN).send(week);
    expect(saved.status).toBe(200);
    expect((await owner.get(`${base()}/hours`)).body).toEqual(week);

    const overlap = await owner
      .put(`${base()}/hours`)
      .set("Origin", ORIGIN)
      .send([
        { weekday: 2, start: "09:00", end: "13:00" },
        { weekday: 2, start: "12:00", end: "15:00" },
      ]);
    expect(overlap.status).toBe(400);
  });

  it("gives a barber their own hours, and an empty week brings back the business hours", async () => {
    const [julio] = (await owner.get(`${base()}/staff`)).body as { id: string }[];
    const own = [{ weekday: 2, start: "10:00", end: "14:00" }];

    await owner.put(`${base()}/staff/${julio!.id}/schedule`).set("Origin", ORIGIN).send(own).expect(200);
    expect((await owner.get(`${base()}/staff`)).body[0].usesBusinessHours).toBe(false);

    await owner.put(`${base()}/staff/${julio!.id}/schedule`).set("Origin", ORIGIN).send([]).expect(200);
    expect((await owner.get(`${base()}/staff`)).body[0].usesBusinessHours).toBe(true);
  });

  it("creates and deletes a block", async () => {
    const created = await owner
      .post(`${base()}/overrides`)
      .set("Origin", ORIGIN)
      .send({ startsAt: "2099-10-12T00:00:00-03:00", endsAt: "2099-10-13T00:00:00-03:00", reason: "Feriado" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ kind: "blocked", staffId: null, reason: "Feriado" });

    expect((await owner.get(`${base()}/overrides`)).body).toHaveLength(1);
    await owner.delete(`${base()}/overrides/${created.body.id}`).set("Origin", ORIGIN).expect(204);
    expect((await owner.get(`${base()}/overrides`)).body).toHaveLength(0);
  });
});

describe("permissions", () => {
  it("hides the business from users who are not members", async () => {
    const { agent: stranger } = await signUp(app, "Extraño");
    expect((await stranger.get(`${base()}/services`)).status).toBe(404);
  });

  it("lets a barber read the catalog but not change it", async () => {
    const { agent: barber, userId } = await signUp(app, "Sofi");
    await db.insert(member).values({
      id: randomUUID(),
      organizationId: business.id,
      userId,
      role: "member",
      createdAt: new Date(),
    });

    expect((await barber.get(`${base()}/services`)).status).toBe(200);
    const res = await barber
      .post(`${base()}/services`)
      .set("Origin", ORIGIN)
      .send({ name: "Corte", durationMinutes: 30, priceCents: 1 });
    expect(res.status).toBe(403);
  });
});

describe("public business page", () => {
  it("shows only active services and barbers, with the deposit each service charges", async () => {
    await owner
      .post(`${base()}/services`)
      .set("Origin", ORIGIN)
      .send({ name: "Servicio oculto", durationMinutes: 20, priceCents: 100000, active: false })
      .expect(201);

    const res = await request(app).get(`/api/v1/public/businesses/${business.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Barbería Don Julio");
    expect(res.body.services.map((s: { name: string }) => s.name)).toEqual(["Corte", "Corte + barba"]);
    // Default rule: fixed $ 3.000 deposit.
    expect(res.body.services[0].depositCents).toBe(300000);
    expect(res.body.staff.map((s: { displayName: string }) => s.displayName)).toEqual(["Julio"]);
  });

  it("returns 404 for an unknown slug", async () => {
    expect((await request(app).get("/api/v1/public/businesses/no-existe-123")).status).toBe(404);
  });
});

describe("effectiveDeposit", () => {
  it("uses the service deposit, else the business rule, never above the price", () => {
    expect(effectiveDeposit(900000, 200000, "fixed", 300000)).toBe(200000);
    expect(effectiveDeposit(900000, null, "fixed", 300000)).toBe(300000);
    expect(effectiveDeposit(200000, null, "fixed", 300000)).toBe(200000);
    expect(effectiveDeposit(900000, null, "percent", 30)).toBe(270000);
    expect(effectiveDeposit(900000, null, "none", 0)).toBe(0);
  });
});
