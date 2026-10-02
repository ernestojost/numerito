import { Router } from "express";
import { eq } from "drizzle-orm";
import { type Availability, AvailabilityQuerySchema, type PublicBusiness, SlugSchema } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import { businesses, organization } from "../../db/schema/index.js";
import { effectiveDeposit } from "../../lib/deposit.js";
import { AppError, notFound } from "../../lib/errors.js";
import { computeAvailability } from "../availability/service.js";
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

  router.get("/businesses/:slug/availability", async (req, res) => {
    const query = AvailabilityQuerySchema.safeParse(req.query);
    if (!query.success) throw new AppError(400, "VALIDATION_ERROR", "Indica serviceId y date (AAAA-MM-DD)");

    const [business] = await db
      .select({ id: organization.id, timezone: businesses.timezone })
      .from(organization)
      .innerJoin(businesses, eq(businesses.id, organization.id))
      .where(eq(organization.slug, String(req.params.slug)))
      .limit(1);
    if (!business) throw notFound("Barbería no encontrada");

    const { slots } = await computeAvailability(db, { businessId: business.id, ...query.data });
    const body: Availability = { date: query.data.date, timezone: business.timezone, slots };
    res.set("Cache-Control", "no-store").json(body);
  });

  return router;
}

