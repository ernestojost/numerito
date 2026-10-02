import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import type { Slot } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import {
  bookings,
  businessHours,
  businesses,
  scheduleOverrides,
  services,
  staff,
  staffSchedules,
  staffServices,
} from "../../db/schema/index.js";
import { notFound } from "../../lib/errors.js";
import { toHHMM } from "../../lib/time.js";
import { type Interval, dayBounds, generateSlots, subtract, union, weekdayOf, zonedTime } from "./intervals.js";

const MINUTE = 60_000;
type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface AvailabilityInput {
  businessId: string;
  serviceId: string;
  date: string;
  staffId?: string;
  now?: Date;
  /** Manual bookings from the panel can be made at short notice. */
  ignoreLeadTime?: boolean;
}

/**
 * Free slots for one service on one local date:
 *   working hours (own or the business's) ∪ extra openings − blocks − live bookings,
 * cut into starts on the business's slot grid where duration + cleanup buffer fit.
 */
export async function computeAvailability(db: Executor, input: AvailabilityInput) {
  const now = input.now ?? new Date();

  const [business] = await db.select().from(businesses).where(eq(businesses.id, input.businessId)).limit(1);
  if (!business) throw notFound("Barbería no encontrada");

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, input.serviceId), eq(services.businessId, business.id), eq(services.active, true)))
    .limit(1);
  if (!service) throw notFound("Servicio no encontrado");

  const candidates = await db
    .select({ id: staff.id })
    .from(staff)
    .innerJoin(staffServices, eq(staffServices.staffId, staff.id))
    .where(
      and(
        eq(staff.businessId, business.id),
        eq(staff.active, true),
        eq(staffServices.serviceId, service.id),
        input.staffId ? eq(staff.id, input.staffId) : undefined,
      ),
    );
  const staffIds = candidates.map((c) => c.id);

  const tz = business.timezone;
  const day = dayBounds(input.date, tz);
  const weekday = weekdayOf(input.date);
  const empty = { business, service, slots: [] as Slot[] };
  if (staffIds.length === 0) return empty;

  const [hours, ownSchedules, overrides, busy] = await Promise.all([
    db
      .select()
      .from(businessHours)
      .where(and(eq(businessHours.businessId, business.id), eq(businessHours.weekday, weekday))),
    db
      .select()
      .from(staffSchedules)
      .where(and(inArray(staffSchedules.staffId, staffIds), eq(staffSchedules.weekday, weekday))),
    db
      .select()
      .from(scheduleOverrides)
      .where(
        and(
          eq(scheduleOverrides.businessId, business.id),
          or(isNull(scheduleOverrides.staffId), inArray(scheduleOverrides.staffId, staffIds)),
          lt(scheduleOverrides.startsAt, new Date(day.end)),
          gt(scheduleOverrides.endsAt, new Date(day.start)),
        ),
      ),
    db
      .select({ staffId: bookings.staffId, startsAt: bookings.startsAt, blocksUntil: bookings.blocksUntil })
      .from(bookings)
      .where(
        and(
          inArray(bookings.staffId, staffIds),
          lt(bookings.startsAt, new Date(day.end)),
          gt(bookings.blocksUntil, new Date(day.start)),
          // A hold whose payment window has passed no longer blocks the slot, even before it's marked expired.
          or(eq(bookings.status, "confirmed"), and(eq(bookings.status, "pending_payment"), gt(bookings.expiresAt, now))),
        ),
      ),
  ]);

  const local = (r: { start: string; end: string }): Interval => ({
    start: zonedTime(input.date, r.start, tz),
    end: zonedTime(input.date, r.end, tz),
  });
  const businessRanges = hours.map((h) => local({ start: toHHMM(h.opensAt), end: toHHMM(h.closesAt) }));
  const toInterval = (r: { startsAt: Date; endsAt: Date }) => ({ start: r.startsAt.getTime(), end: r.endsAt.getTime() });

  const rules = {
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    stepMinutes: business.slotStepMinutes,
    notBefore: input.ignoreLeadTime ? now.getTime() : now.getTime() + business.minLeadMinutes * MINUTE,
    notAfter: now.getTime() + business.maxAdvanceDays * 24 * 60 * MINUTE,
  };

  const byStart = new Map<number, string[]>();
  for (const staffId of staffIds) {
    const own = ownSchedules.filter((s) => s.staffId === staffId);
    // A barber with their own hours works those; otherwise the business hours.
    const working = own.length
      ? own.map((s) => local({ start: toHHMM(s.startsAt), end: toHHMM(s.endsAt) }))
      : businessRanges;

    const applies = (o: (typeof overrides)[number]) => o.staffId === null || o.staffId === staffId;
    const extra = overrides.filter((o) => applies(o) && o.kind === "extra_open").map(toInterval);
    const blocked = overrides.filter((o) => applies(o) && o.kind === "blocked").map(toInterval);
    const taken = busy
      .filter((b) => b.staffId === staffId)
      .map((b) => ({ start: b.startsAt.getTime(), end: b.blocksUntil.getTime() }));

    const free = subtract(union(working, extra), [...blocked, ...taken]).map((i) => ({
      start: Math.max(i.start, day.start),
      end: Math.min(i.end, day.end),
    }));
    for (const start of generateSlots(free, day.start, rules)) {
      byStart.set(start, [...(byStart.get(start) ?? []), staffId]);
    }
  }

  const slots: Slot[] = [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, ids]) => ({
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(start + service.durationMinutes * MINUTE).toISOString(),
      staffIds: ids,
    }));
  return { business, service, slots };
}

/** Today's date in a time zone, as YYYY-MM-DD. */
export function localDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}
