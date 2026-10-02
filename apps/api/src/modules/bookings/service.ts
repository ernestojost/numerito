import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Booking, CreateBookingSchema, ManualBookingSchema, StatusChangeSchema } from "@numerito/shared";
import type { z } from "zod";
import type { Db } from "../../db/client.js";
import {
  bookingEvents,
  bookings,
  businesses,
  customers,
  organization,
  services,
  staff,
} from "../../db/schema/index.js";
import { effectiveDeposit } from "../../lib/deposit.js";
import { AppError, notFound } from "../../lib/errors.js";
import { PG_EXCLUSION_VIOLATION, isPgError } from "../../lib/pg.js";
import { dayBounds } from "../availability/intervals.js";
import { computeAvailability, localDate } from "../availability/service.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type CreateBooking = z.output<typeof CreateBookingSchema>;
type ManualBooking = z.output<typeof ManualBookingSchema>;
type StatusChange = z.output<typeof StatusChangeSchema>;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const slotTaken = () => new AppError(409, "SLOT_TAKEN", "Ese horario ya no está disponible. Elige otro.");

export function bookingsService(db: Db) {
  /** Marks holds whose payment window passed as expired, so they stop blocking the agenda. */
  async function expireStaleHolds(tx: Tx, businessId: string, now: Date) {
    await tx
      .update(bookings)
      .set({ status: "expired" })
      .where(and(eq(bookings.businessId, businessId), eq(bookings.status, "pending_payment"), lt(bookings.expiresAt, now)));
  }

  /** Busiest barbers last, so "any barber" spreads the work across the day. */
  async function orderByLoad(tx: Tx, staffIds: string[], date: string, timezone: string) {
    if (staffIds.length < 2) return staffIds;
    const day = dayBounds(date, timezone);
    const rows = await tx
      .select({ staffId: bookings.staffId, total: count() })
      .from(bookings)
      .where(
        and(
          inArray(bookings.staffId, staffIds),
          eq(bookings.status, "confirmed"),
          gte(bookings.startsAt, new Date(day.start)),
          lt(bookings.startsAt, new Date(day.end)),
        ),
      )
      .groupBy(bookings.staffId);
    const load = new Map(rows.map((r) => [r.staffId, r.total]));
    return [...staffIds].sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0));
  }

  /**
   * Inserts the booking for the first barber that can take it. Each attempt runs in a savepoint: if the
   * exclusion constraint rejects it (someone else took that barber a moment ago), the next one is tried.
   */
  async function insertFirstFree(tx: Tx, staffIds: string[], values: Omit<typeof bookings.$inferInsert, "staffId">) {
    for (const staffId of staffIds) {
      try {
        const [row] = await tx.transaction(async (sp) => sp.insert(bookings).values({ ...values, staffId }).returning({ id: bookings.id }));
        return row!.id;
      } catch (err) {
        if (!isPgError(err, PG_EXCLUSION_VIOLATION)) throw err;
      }
    }
    throw slotTaken();
  }

  async function createOnline(userId: string, userName: string, userEmail: string, input: CreateBooking) {
    const [business] = await db
      .select({ id: organization.id, timezone: businesses.timezone })
      .from(organization)
      .innerJoin(businesses, eq(businesses.id, organization.id))
      .where(eq(organization.slug, input.businessSlug))
      .limit(1);
    if (!business) throw notFound("Barbería no encontrada");

    const startsAt = new Date(input.startsAt);
    const now = new Date();

    const id = await db.transaction(async (tx) => {
      await expireStaleHolds(tx, business.id, now);

      const date = localDate(startsAt, business.timezone);
      const availability = await computeAvailability(tx, {
        businessId: business.id,
        serviceId: input.serviceId,
        date,
        staffId: input.staffId ?? undefined,
        now,
      });
      const slot = availability.slots.find((s) => s.startsAt === startsAt.toISOString());
      if (!slot) throw slotTaken();

      const [customer] = await tx
        .insert(customers)
        .values({ businessId: business.id, userId, name: userName, email: userEmail })
        .onConflictDoUpdate({ target: [customers.businessId, customers.userId], set: { name: userName, email: userEmail } })
        .returning({ id: customers.id });

      const { service, business: settings } = availability;
      const bookingId = await insertFirstFree(tx, await orderByLoad(tx, slot.staffIds, date, business.timezone), {
        businessId: business.id,
        serviceId: service.id,
        customerId: customer!.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMinutes * MINUTE),
        blocksUntil: new Date(startsAt.getTime() + (service.durationMinutes + service.bufferMinutes) * MINUTE),
        // Deposits are collected in the payments phase; until then online bookings are confirmed directly.
        status: "confirmed",
        priceCents: service.priceCents,
        depositCents: effectiveDeposit(service.priceCents, service.depositCents, settings.depositType, settings.depositValue),
        source: "online",
        createdBy: userId,
      });
      await tx.insert(bookingEvents).values({ bookingId, type: "created", actorUserId: userId, data: { source: "online" } });
      return bookingId;
    });

    return getById(id);
  }

  async function createManual(businessId: string, actorUserId: string, input: ManualBooking) {
    const startsAt = new Date(input.startsAt);
    const now = new Date();

    const id = await db.transaction(async (tx) => {
      await expireStaleHolds(tx, businessId, now);
      const [settings] = await tx.select({ timezone: businesses.timezone }).from(businesses).where(eq(businesses.id, businessId));
      const availability = await computeAvailability(tx, {
        businessId,
        serviceId: input.serviceId,
        date: localDate(startsAt, settings!.timezone),
        staffId: input.staffId,
        now,
        ignoreLeadTime: true,
      });
      if (!availability.slots.some((s) => s.startsAt === startsAt.toISOString())) throw slotTaken();

      const [customer] = await tx
        .insert(customers)
        .values({ businessId, name: input.customer.name, phone: input.customer.phone })
        .returning({ id: customers.id });

      const { service } = availability;
      const bookingId = await insertFirstFree(tx, [input.staffId], {
        businessId,
        serviceId: service.id,
        customerId: customer!.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMinutes * MINUTE),
        blocksUntil: new Date(startsAt.getTime() + (service.durationMinutes + service.bufferMinutes) * MINUTE),
        status: "confirmed",
        priceCents: service.priceCents,
        depositCents: 0,
        source: "manual",
        notes: input.notes,
        createdBy: actorUserId,
      });
      await tx.insert(bookingEvents).values({ bookingId, type: "created", actorUserId, data: { source: "manual" } });
      return bookingId;
    });

    return getById(id);
  }

  function baseQuery() {
    return db
      .select({
        b: bookings,
        businessName: organization.name,
        businessSlug: organization.slug,
        timezone: businesses.timezone,
        cancellationWindowHours: businesses.cancellationWindowHours,
        serviceName: services.name,
        durationMinutes: services.durationMinutes,
        staffName: staff.displayName,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerUserId: customers.userId,
      })
      .from(bookings)
      .innerJoin(organization, eq(organization.id, bookings.businessId))
      .innerJoin(businesses, eq(businesses.id, bookings.businessId))
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .innerJoin(staff, eq(staff.id, bookings.staffId))
      .innerJoin(customers, eq(customers.id, bookings.customerId));
  }

  type Row = Awaited<ReturnType<ReturnType<typeof baseQuery>["execute"]>>[number];

  function toBooking(r: Row): Booking {
    return {
      id: r.b.id,
      number: `T-${String(r.b.number).padStart(4, "0")}`,
      status: r.b.status,
      startsAt: r.b.startsAt.toISOString(),
      endsAt: r.b.endsAt.toISOString(),
      priceCents: r.b.priceCents,
      depositCents: r.b.depositCents,
      source: r.b.source,
      business: { id: r.b.businessId, name: r.businessName, slug: r.businessSlug, timezone: r.timezone },
      service: { id: r.b.serviceId, name: r.serviceName, durationMinutes: r.durationMinutes },
      staff: { id: r.b.staffId, displayName: r.staffName },
      customer: { id: r.b.customerId, name: r.customerName, phone: r.customerPhone },
      cancellableUntil: new Date(r.b.startsAt.getTime() - r.cancellationWindowHours * HOUR).toISOString(),
      notes: r.b.notes,
    };
  }

  async function getById(id: string) {
    const [row] = await baseQuery().where(eq(bookings.id, id)).limit(1);
    if (!row) throw notFound("Turno no encontrado");
    return toBooking(row);
  }

  async function listForUser(userId: string) {
    const rows = await baseQuery().where(eq(customers.userId, userId)).orderBy(desc(bookings.startsAt)).limit(100);
    return rows.map(toBooking);
  }

  async function listForBusiness(businessId: string, from: Date, to: Date) {
    const rows = await baseQuery()
      .where(and(eq(bookings.businessId, businessId), lt(bookings.startsAt, to), gte(bookings.endsAt, from)))
      .orderBy(asc(bookings.startsAt));
    return rows.map(toBooking);
  }

  async function cancelByClient(userId: string, bookingId: string, now = new Date()) {
    const [row] = await baseQuery()
      .where(and(eq(bookings.id, bookingId), eq(customers.userId, userId)))
      .limit(1);
    if (!row) throw notFound("Turno no encontrado");
    const booking = toBooking(row);

    if (booking.status !== "confirmed" && booking.status !== "pending_payment") {
      throw new AppError(409, "NOT_CANCELLABLE", "Este turno ya no se puede cancelar");
    }
    if (now >= new Date(booking.cancellableUntil)) {
      throw new AppError(403, "CANCEL_WINDOW_PASSED", "Ya pasó el plazo para cancelar desde la app. Habla con la barbería.");
    }
    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: "cancelled_by_client", cancelledAt: now }).where(eq(bookings.id, bookingId));
      await tx.insert(bookingEvents).values({ bookingId, type: "cancelled_by_client", actorUserId: userId });
    });
    return getById(bookingId);
  }

  async function changeStatus(businessId: string, bookingId: string, actorUserId: string, change: StatusChange) {
    const [current] = await db
      .select({ status: bookings.status })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId)))
      .limit(1);
    if (!current) throw notFound("Turno no encontrado");

    const allowed =
      change.status === "cancelled_by_business"
        ? current.status === "confirmed" || current.status === "pending_payment"
        : current.status === "confirmed";
    if (!allowed) throw new AppError(409, "INVALID_TRANSITION", "Este turno no admite ese cambio");

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: change.status,
          ...(change.status === "cancelled_by_business" && { cancelledAt: new Date(), cancelReason: change.reason }),
        })
        .where(eq(bookings.id, bookingId));
      await tx.insert(bookingEvents).values({ bookingId, type: change.status, actorUserId, data: { reason: change.reason } });
    });
    return getById(bookingId);
  }

  return { createOnline, createManual, getById, listForUser, listForBusiness, cancelByClient, changeStatus };
}

/** For tests: raw count of live bookings of a barber at an instant. */
export async function liveBookingsAt(db: Db, staffId: string, at: Date) {
  const [row] = await db
    .select({ total: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.staffId, staffId),
        sql`${bookings.status} in ('pending_payment', 'confirmed')`,
        lt(bookings.startsAt, new Date(at.getTime() + 1)),
        gte(bookings.blocksUntil, at),
      ),
    );
  return row?.total ?? 0;
}
