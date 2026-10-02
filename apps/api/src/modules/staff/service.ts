import { and, asc, eq, inArray, max } from "drizzle-orm";
import type { Staff, StaffInputSchema } from "@numerito/shared";
import type { z } from "zod";
import type { Db } from "../../db/client.js";
import { services, staff, staffSchedules, staffServices } from "../../db/schema/index.js";
import { AppError, notFound } from "../../lib/errors.js";

type StaffInput = z.output<typeof StaffInputSchema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function staffService(db: Db) {
  async function assertServicesBelong(tx: Db | Tx, businessId: string, serviceIds: string[]) {
    if (serviceIds.length === 0) return;
    const found = await tx
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.businessId, businessId), inArray(services.id, serviceIds)));
    if (found.length !== new Set(serviceIds).size) {
      throw new AppError(400, "VALIDATION_ERROR", "Algún servicio no pertenece a este negocio");
    }
  }

  async function setServices(tx: Tx, staffId: string, serviceIds: string[]) {
    await tx.delete(staffServices).where(eq(staffServices.staffId, staffId));
    const unique = [...new Set(serviceIds)];
    if (unique.length > 0) await tx.insert(staffServices).values(unique.map((serviceId) => ({ staffId, serviceId })));
  }

  async function list(businessId: string, { onlyActive = false } = {}): Promise<Staff[]> {
    const where = onlyActive
      ? and(eq(staff.businessId, businessId), eq(staff.active, true))
      : eq(staff.businessId, businessId);
    const rows = await db.select().from(staff).where(where).orderBy(asc(staff.sortOrder), asc(staff.createdAt));
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const [links, schedules] = await Promise.all([
      db.select().from(staffServices).where(inArray(staffServices.staffId, ids)),
      db.select({ staffId: staffSchedules.staffId }).from(staffSchedules).where(inArray(staffSchedules.staffId, ids)),
    ]);
    const withOwnHours = new Set(schedules.map((s) => s.staffId));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      displayName: r.displayName,
      email: r.email,
      active: r.active,
      sortOrder: r.sortOrder,
      serviceIds: links.filter((l) => l.staffId === r.id).map((l) => l.serviceId),
      usesBusinessHours: !withOwnHours.has(r.id),
    }));
  }

  async function get(businessId: string, staffId: string) {
    const found = (await list(businessId)).find((s) => s.id === staffId);
    if (!found) throw notFound("Barbero no encontrado");
    return found;
  }

  async function create(businessId: string, input: StaffInput): Promise<Staff> {
    const id = await db.transaction(async (tx) => {
      await assertServicesBelong(tx, businessId, input.serviceIds);
      const [{ last } = { last: null }] = await tx
        .select({ last: max(staff.sortOrder) })
        .from(staff)
        .where(eq(staff.businessId, businessId));
      const [row] = await tx
        .insert(staff)
        .values({
          businessId,
          displayName: input.displayName,
          email: input.email,
          active: input.active,
          sortOrder: (last ?? -1) + 1,
        })
        .returning({ id: staff.id });
      await setServices(tx, row!.id, input.serviceIds);
      return row!.id;
    });
    return get(businessId, id);
  }

  async function update(businessId: string, staffId: string, input: Partial<StaffInput>): Promise<Staff> {
    await db.transaction(async (tx) => {
      const { serviceIds, ...fields } = input;
      const [row] = await tx
        .update(staff)
        .set(fields)
        .where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)))
        .returning({ id: staff.id });
      if (!row) throw notFound("Barbero no encontrado");
      if (serviceIds) {
        await assertServicesBelong(tx, businessId, serviceIds);
        await setServices(tx, staffId, serviceIds);
      }
    });
    return get(businessId, staffId);
  }

  async function remove(businessId: string, staffId: string) {
    const deleted = await db
      .delete(staff)
      .where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)))
      .returning({ id: staff.id });
    if (deleted.length === 0) throw notFound("Barbero no encontrado");
  }

  return { list, get, create, update, remove };
}
