import { and, asc, eq, inArray, max } from "drizzle-orm";
import type { Service, ServiceInputSchema } from "@numerito/shared";
import type { z } from "zod";
import type { Db } from "../../db/client.js";
import { services, staffServices } from "../../db/schema/index.js";
import { notFound } from "../../lib/errors.js";

type ServiceInput = z.output<typeof ServiceInputSchema>;
type ServiceRow = typeof services.$inferSelect;

function toService(row: ServiceRow, staffIds: string[]): Service {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.durationMinutes,
    bufferMinutes: row.bufferMinutes,
    priceCents: row.priceCents,
    depositCents: row.depositCents,
    active: row.active,
    sortOrder: row.sortOrder,
    staffIds,
  };
}

export function servicesService(db: Db) {
  async function staffIdsByService(serviceIds: string[]) {
    const map = new Map<string, string[]>(serviceIds.map((id) => [id, []]));
    if (serviceIds.length === 0) return map;
    const rows = await db.select().from(staffServices).where(inArray(staffServices.serviceId, serviceIds));
    for (const r of rows) map.get(r.serviceId)?.push(r.staffId);
    return map;
  }

  async function list(businessId: string, { onlyActive = false } = {}): Promise<Service[]> {
    const where = onlyActive
      ? and(eq(services.businessId, businessId), eq(services.active, true))
      : eq(services.businessId, businessId);
    const rows = await db.select().from(services).where(where).orderBy(asc(services.sortOrder), asc(services.createdAt));
    const staffIds = await staffIdsByService(rows.map((r) => r.id));
    return rows.map((r) => toService(r, staffIds.get(r.id) ?? []));
  }

  async function create(businessId: string, input: ServiceInput): Promise<Service> {
    const [{ last } = { last: null }] = await db
      .select({ last: max(services.sortOrder) })
      .from(services)
      .where(eq(services.businessId, businessId));
    const [row] = await db
      .insert(services)
      .values({ ...input, businessId, sortOrder: (last ?? -1) + 1 })
      .returning();
    return toService(row!, []);
  }

  async function update(businessId: string, serviceId: string, input: Partial<ServiceInput>): Promise<Service> {
    const [row] = await db
      .update(services)
      .set(input)
      .where(and(eq(services.id, serviceId), eq(services.businessId, businessId)))
      .returning();
    if (!row) throw notFound("Servicio no encontrado");
    const staffIds = await staffIdsByService([row.id]);
    return toService(row, staffIds.get(row.id) ?? []);
  }

  async function remove(businessId: string, serviceId: string) {
    const deleted = await db
      .delete(services)
      .where(and(eq(services.id, serviceId), eq(services.businessId, businessId)))
      .returning({ id: services.id });
    if (deleted.length === 0) throw notFound("Servicio no encontrado");
  }

  return { list, create, update, remove };
}
