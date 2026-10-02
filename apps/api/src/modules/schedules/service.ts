import { and, asc, eq, gte } from "drizzle-orm";
import type { Override, OverrideInputSchema, TimeRange, WeeklySchedule } from "@numerito/shared";
import type { z } from "zod";
import type { Db } from "../../db/client.js";
import { businessHours, scheduleOverrides, staff, staffSchedules } from "../../db/schema/index.js";
import { AppError, notFound } from "../../lib/errors.js";
import { toHHMM } from "../../lib/time.js";

type OverrideInput = z.output<typeof OverrideInputSchema>;

const byDayThenStart = (a: TimeRange, b: TimeRange) => a.weekday - b.weekday || a.start.localeCompare(b.start);

export function schedulesService(db: Db) {
  async function assertStaffBelongs(businessId: string, staffId: string) {
    const [row] = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)))
      .limit(1);
    if (!row) throw notFound("Barbero no encontrado");
  }

  async function getBusinessHours(businessId: string): Promise<TimeRange[]> {
    const rows = await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.businessId, businessId))
      .orderBy(asc(businessHours.weekday), asc(businessHours.opensAt));
    return rows.map((r) => ({ weekday: r.weekday, start: toHHMM(r.opensAt), end: toHHMM(r.closesAt) }));
  }

  /** Replaces the whole week in one transaction. */
  async function setBusinessHours(businessId: string, week: WeeklySchedule) {
    await db.transaction(async (tx) => {
      await tx.delete(businessHours).where(eq(businessHours.businessId, businessId));
      if (week.length > 0) {
        await tx
          .insert(businessHours)
          .values(week.map((r) => ({ businessId, weekday: r.weekday, opensAt: r.start, closesAt: r.end })));
      }
    });
    return [...week].sort(byDayThenStart);
  }

  async function getStaffSchedule(businessId: string, staffId: string): Promise<TimeRange[]> {
    await assertStaffBelongs(businessId, staffId);
    const rows = await db
      .select()
      .from(staffSchedules)
      .where(eq(staffSchedules.staffId, staffId))
      .orderBy(asc(staffSchedules.weekday), asc(staffSchedules.startsAt));
    return rows.map((r) => ({ weekday: r.weekday, start: toHHMM(r.startsAt), end: toHHMM(r.endsAt) }));
  }

  /** An empty week means "use the business hours". */
  async function setStaffSchedule(businessId: string, staffId: string, week: WeeklySchedule) {
    await assertStaffBelongs(businessId, staffId);
    await db.transaction(async (tx) => {
      await tx.delete(staffSchedules).where(eq(staffSchedules.staffId, staffId));
      if (week.length > 0) {
        await tx
          .insert(staffSchedules)
          .values(week.map((r) => ({ staffId, weekday: r.weekday, startsAt: r.start, endsAt: r.end })));
      }
    });
    return [...week].sort(byDayThenStart);
  }

  async function listOverrides(businessId: string, from = new Date()): Promise<Override[]> {
    const rows = await db
      .select()
      .from(scheduleOverrides)
      .where(and(eq(scheduleOverrides.businessId, businessId), gte(scheduleOverrides.endsAt, from)))
      .orderBy(asc(scheduleOverrides.startsAt));
    return rows.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      kind: r.kind,
      reason: r.reason,
    }));
  }

  async function createOverride(businessId: string, input: OverrideInput): Promise<Override> {
    if (input.staffId) await assertStaffBelongs(businessId, input.staffId);
    const [row] = await db
      .insert(scheduleOverrides)
      .values({
        businessId,
        staffId: input.staffId,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        kind: input.kind,
        reason: input.reason,
      })
      .returning();
    if (!row) throw new AppError(500, "INTERNAL_ERROR", "No se pudo guardar");
    return {
      id: row.id,
      staffId: row.staffId,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      kind: row.kind,
      reason: row.reason,
    };
  }

  async function removeOverride(businessId: string, overrideId: string) {
    const deleted = await db
      .delete(scheduleOverrides)
      .where(and(eq(scheduleOverrides.id, overrideId), eq(scheduleOverrides.businessId, businessId)))
      .returning({ id: scheduleOverrides.id });
    if (deleted.length === 0) throw notFound("Bloqueo no encontrado");
  }

  return {
    getBusinessHours,
    setBusinessHours,
    getStaffSchedule,
    setStaffSchedule,
    listOverrides,
    createOverride,
    removeOverride,
  };
}
