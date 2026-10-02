import { and, count, eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateBookingResponse } from "@numerito/shared";
import { createApp } from "../../app.js";
import { db, sql } from "../../db/client.js";
import { bookingEvents, bookings, payments } from "../../db/schema/index.js";
import type { PaymentProvider, ProviderPayment } from "../../lib/payments/index.js";
import { simulatedPaymentId } from "../../lib/payments/simulated.js";
import { type Agent, ORIGIN, createBusiness, signUp } from "../../test/helpers.js";
import { zonedTime } from "../availability/intervals.js";
import { localDate } from "../availability/service.js";
import { bookingsService } from "../bookings/service.js";

const TZ = "America/Argentina/Buenos_Aires";
const DEPOSIT = 300000;

/** Plays Mercado Pago in the webhook tests: getPayment answers whatever the test registered. */
class FakeMercadoPago implements PaymentProvider {
  readonly name = "mercadopago";
  readonly payments = new Map<string, ProviderPayment>();
  lookups = 0;
  async createCheckout() {
    return { preferenceId: "pref-1", checkoutUrl: "https://mercadopago.test/checkout" };
  }
  async getPayment(id: string) {
    this.lookups++;
    const p = this.payments.get(id);
    if (!p) throw new Error("unknown payment");
    return p;
  }
}

const app = createApp({ checkDb: async () => true }); // no MP_ACCESS_TOKEN in tests → simulated checkout
const fakeMp = new FakeMercadoPago();
const mpApp = createApp({ checkDb: async () => true, paymentProvider: fakeMp });

let owner: Agent;
let client: Agent;
let business: { id: string; slug: string };
let serviceId: string;
let barber: string;
const date = localDate(new Date(Date.now() + 3 * 24 * 3_600_000), TZ);
const at = (hhmm: string) => new Date(zonedTime(date, hhmm, TZ)).toISOString();

async function hold(startsAt: string, agent = client): Promise<CreateBookingResponse> {
  const res = await agent
    .post("/api/v1/bookings")
    .set("Origin", ORIGIN)
    .send({ businessSlug: business.slug, serviceId, staffId: barber, startsAt });
  expect(res.status).toBe(201);
  return res.body;
}
const payReturn = (bookingId: string, paymentId: string, agent = client) =>
  agent.post(`/api/v1/me/bookings/${bookingId}/payment-return`).set("Origin", ORIGIN).send({ paymentId });
const statusOf = async (id: string) => (await db.select({ s: bookings.status }).from(bookings).where(eq(bookings.id, id)))[0]!.s;
const freeStarts = async () =>
  (
    await request(app)
      .get(`/api/v1/public/businesses/${business.slug}/availability`)
      .query({ serviceId, date, staffId: barber })
  ).body.slots.map((s: { startsAt: string }) => s.startsAt) as string[];

beforeAll(async () => {
  ({ agent: owner } = await signUp(app, "Julio"));
  ({ agent: client } = await signUp(app, "Nico"));
  business = await createBusiness(owner);
  const base = `/api/v1/businesses/${business.id}`;
  // No own deposit: the business default (fixed $ 3.000) applies.
  serviceId = (
    await owner.post(`${base}/services`).set("Origin", ORIGIN).send({ name: "Corte + barba", durationMinutes: 45, priceCents: 900000 })
  ).body.id;
  barber = (await owner.post(`${base}/staff`).set("Origin", ORIGIN).send({ displayName: "Marcos", serviceIds: [serviceId] })).body.id;
  const everyDay = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: "09:00", end: "20:00" }));
  await owner.put(`${base}/hours`).set("Origin", ORIGIN).send(everyDay).expect(200);
});

afterAll(async () => {
  await sql.end();
});

describe("holding a slot while the deposit is paid", () => {
  it("creates a 10-minute hold and a checkout link", async () => {
    const { booking, checkoutUrl } = await hold(at("09:00"));
    expect(booking).toMatchObject({ status: "pending_payment", depositCents: DEPOSIT });
    const minutes = (new Date(booking.expiresAt!).getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(9);
    expect(minutes).toBeLessThanOrEqual(10);
    expect(checkoutUrl).toContain("/pago-simulado?turno=");
    // Held slots aren't offered to anybody else.
    expect(await freeStarts()).not.toContain(at("09:00"));
  });

  it("confirms the booking when the payment is approved, and only records it once", async () => {
    const { booking } = await hold(at("10:00"));
    const paymentId = simulatedPaymentId(booking.id, "approved", DEPOSIT);

    const first = await payReturn(booking.id, paymentId);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ status: "confirmed", expiresAt: null, payment: { status: "approved", amountCents: DEPOSIT } });

    // The client reloads the page, the webhook arrives later…: nothing changes.
    await payReturn(booking.id, paymentId).expect(200);
    const [{ total }] = (await db
      .select({ total: count() })
      .from(payments)
      .where(and(eq(payments.bookingId, booking.id), eq(payments.providerPaymentId, paymentId)))) as [{ total: number }];
    expect(total).toBe(1);
  });

  it("keeps the hold when the payment is rejected", async () => {
    const { booking } = await hold(at("11:00"));
    const res = await payReturn(booking.id, simulatedPaymentId(booking.id, "rejected", DEPOSIT));
    expect(res.body).toMatchObject({ status: "pending_payment", payment: { status: "rejected" } });
  });

  it("doesn't accept a payment for another booking or someone else's booking", async () => {
    const { booking } = await hold(at("12:00"));
    const { booking: other } = await hold(at("12:45"));
    expect((await payReturn(booking.id, simulatedPaymentId(other.id, "approved", DEPOSIT))).status).toBe(400);

    const { agent: stranger } = await signUp(app, "Extraño");
    expect((await payReturn(booking.id, simulatedPaymentId(booking.id, "approved", DEPOSIT), stranger)).status).toBe(404);
  });
});

describe("expired holds", () => {
  it("releases the slot when nobody pays, and refuses a new checkout", async () => {
    const { booking } = await hold(at("14:00"));
    await db.update(bookings).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(bookings.id, booking.id));

    // Even before the sweeper runs, an expired hold no longer blocks the slot.
    expect(await freeStarts()).toContain(at("14:00"));
    expect(await bookingsService(db).expireHolds()).toBeGreaterThanOrEqual(1);
    expect(await statusOf(booking.id)).toBe("expired");

    const checkout = await client.post(`/api/v1/me/bookings/${booking.id}/checkout`).set("Origin", ORIGIN);
    expect(checkout.status).toBe(409);
  });

  it("still confirms a late payment if the slot is still free", async () => {
    const { booking } = await hold(at("15:00"));
    await db.update(bookings).set({ status: "expired", expiresAt: new Date(Date.now() - 1000) }).where(eq(bookings.id, booking.id));
    const res = await payReturn(booking.id, simulatedPaymentId(booking.id, "approved", DEPOSIT));
    expect(res.body.status).toBe("confirmed");
  });

  it("doesn't double-book when someone paid late and the slot was already taken", async () => {
    const { booking: late } = await hold(at("16:00"));
    await db.update(bookings).set({ status: "expired" }).where(eq(bookings.id, late.id));
    const { agent: other } = await signUp(app, "Dani");
    const { booking: taken } = await hold(at("16:00"), other);

    const res = await payReturn(late.id, simulatedPaymentId(late.id, "approved", DEPOSIT));
    expect(res.body.status).toBe("expired");
    expect(await statusOf(taken.id)).toBe("pending_payment");
    const events = await db.select({ type: bookingEvents.type }).from(bookingEvents).where(eq(bookingEvents.bookingId, late.id));
    expect(events.map((e) => e.type)).toContain("paid_after_slot_was_taken");
  });
});

describe("Mercado Pago webhook", () => {
  const notify = (paymentId: string) =>
    request(mpApp).post(`/api/v1/webhooks/mercadopago?data.id=${paymentId}&type=payment`).send({ type: "payment", data: { id: paymentId } });

  it("confirms the booking once even if the notification arrives twice", async () => {
    // Both apps share the database: the hold is created normally, the notification goes to the "Mercado Pago" app.
    const { booking } = await hold(at("18:00"));

    // Unique per run: the shared test database remembers every processed event (that's the point).
    const paymentId = String(Date.now());
    fakeMp.payments.set(paymentId, { id: paymentId, status: "approved", bookingId: booking.id, amountCents: DEPOSIT, raw: {} });
    const lookupsBefore = fakeMp.lookups;

    const first = await notify(paymentId);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ duplicate: false });
    expect(await statusOf(booking.id)).toBe("confirmed");

    const retry = await notify(paymentId);
    expect(retry.body).toEqual({ duplicate: true });
    expect(fakeMp.lookups - lookupsBefore).toBe(1); // the retry didn't even ask Mercado Pago again
  });

  it("acknowledges events that aren't payments", async () => {
    const res = await request(mpApp).post("/api/v1/webhooks/mercadopago?type=merchant_order&data.id=1").send({});
    expect(res.body).toEqual({ ignored: true });
  });

  it("lets Mercado Pago retry when the payment can't be read", async () => {
    const unknown = `missing-${Date.now()}`;
    expect((await notify(unknown)).status).toBe(500);
    fakeMp.payments.set(unknown, { id: unknown, status: "rejected", bookingId: null, amountCents: 0, raw: {} });
    // The failed attempt wasn't recorded as processed, so the retry is handled (and fails cleanly with 400).
    expect((await notify(unknown)).status).toBe(400);
  });
});
