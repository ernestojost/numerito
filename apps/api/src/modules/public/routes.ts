import { Router } from "express";
import { eq } from "drizzle-orm";
import { type PublicBusiness, SlugSchema } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import { businesses, organization } from "../../db/schema/index.js";
import { notFound } from "../../lib/errors.js";
import { schedulesService } from "../schedules/service.js";
import { servicesService } from "../services/service.js";
import { staffService } from "../staff/service.js";

/** Unauthenticated endpoints behind the public booking page /b/:slug. */
export function publicRouter(db: Db) {
  const router = Router();
  const services = servicesService(db);
  const staff = staffService(db);
  const schedules = schedulesService(db);

  router.get("/businesses/:slug", async (req, res) => {
    const slug = SlugSchema.safeParse(req.params.slug);
    if (!slug.success) throw notFound("Barbería no encontrada");

    const [business] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        timezone: businesses.timezone,
        depositType: businesses.depositType,
        depositValue: businesses.depositValue,
      })
      .from(organization)
      .innerJoin(businesses, eq(businesses.id, organization.id))
      .where(eq(organization.slug, slug.data))
      .limit(1);
    if (!business) throw notFound("Barbería no encontrada");

    const [activeServices, activeStaff, hours] = await Promise.all([
      services.list(business.id, { onlyActive: true }),
      staff.list(business.id, { onlyActive: true }),
      schedules.getBusinessHours(business.id),
    ]);
    const activeStaffIds = new Set(activeStaff.map((s) => s.id));

    const body: PublicBusiness = {
      id: business.id,
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
      hours,
      depositCents: business.depositType === "fixed" ? business.depositValue : 0,
      services: activeServices.map(({ active: _active, ...s }) => ({
        ...s,
        depositCents: effectiveDeposit(s.priceCents, s.depositCents, business.depositType, business.depositValue),
        staffIds: s.staffIds.filter((id) => activeStaffIds.has(id)),
      })),
      staff: activeStaff.map((s) => ({ id: s.id, displayName: s.displayName, serviceIds: s.serviceIds })),
    };
    res.set("Cache-Control", "no-store").json(body);
  });

  return router;
}

/** The deposit the client pays for a service: its own, else the business rule. */
export function effectiveDeposit(
  priceCents: number,
  serviceDeposit: number | null,
  type: "none" | "fixed" | "percent",
  value: number,
) {
  if (serviceDeposit !== null) return Math.min(serviceDeposit, priceCents);
  if (type === "none") return 0;
  if (type === "percent") return Math.round((priceCents * value) / 100);
  return Math.min(value, priceCents);
}
