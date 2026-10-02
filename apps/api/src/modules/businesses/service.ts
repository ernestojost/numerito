import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Business, CreateBusinessSchema } from "@numerito/shared";
import type { z } from "zod";
import type { Db } from "../../db/client.js";
import { businesses, member, organization } from "../../db/schema/index.js";
import { AppError } from "../../lib/errors.js";
import { PG_UNIQUE_VIOLATION, isPgError } from "../../lib/pg.js";

type CreateBusiness = z.output<typeof CreateBusinessSchema>;

export function businessService(db: Db) {
  async function isSlugAvailable(slug: string) {
    const existing = await db.select({ id: organization.id }).from(organization).where(eq(organization.slug, slug)).limit(1);
    return existing.length === 0;
  }

  /** Creates the organization, makes the user its owner and stores the booking settings, atomically. */
  async function create(userId: string, input: CreateBusiness): Promise<Business> {
    const id = randomUUID();
    try {
      await db.transaction(async (tx) => {
        await tx.insert(organization).values({ id, name: input.name, slug: input.slug, createdAt: new Date() });
        await tx.insert(member).values({ id: randomUUID(), organizationId: id, userId, role: "owner", createdAt: new Date() });
        await tx.insert(businesses).values({ id, category: input.category, timezone: input.timezone });
      });
    } catch (err) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) {
        throw new AppError(409, "SLUG_TAKEN", "Ese link ya está en uso, prueba con otro");
      }
      throw err;
    }
    return { id, name: input.name, slug: input.slug, category: input.category, timezone: input.timezone, role: "owner" };
  }

  async function listForUser(userId: string): Promise<Business[]> {
    const rows = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        category: businesses.category,
        timezone: businesses.timezone,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .innerJoin(businesses, eq(businesses.id, organization.id))
      .where(and(eq(member.userId, userId)));
    return rows.map((r) => ({ ...r, role: r.role as Business["role"] }));
  }

  return { isSlugAvailable, create, listForUser };
}
