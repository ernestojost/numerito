import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { member } from "../db/schema/index.js";
import { AppError } from "../lib/errors.js";
import { currentUser } from "./requireAuth.js";

export type BusinessRole = "owner" | "admin" | "member";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      membership?: { businessId: string; role: BusinessRole };
    }
  }
}

/** Requires the signed-in user to be a member of :businessId with one of the given roles. */
export function requireBusinessRole(db: Db, ...roles: BusinessRole[]): RequestHandler {
  return async (req, _res, next) => {
    const businessId = req.params.businessId;
    if (typeof businessId !== "string") return next(new AppError(400, "VALIDATION_ERROR", "Falta el negocio"));

    const [row] = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.organizationId, businessId), eq(member.userId, currentUser(req).id)))
      .limit(1);

    // Same answer for "doesn't exist" and "not yours": don't leak which businesses exist.
    if (!row) return next(new AppError(404, "NOT_FOUND", "Negocio no encontrado"));
    if (!roles.includes(row.role as BusinessRole)) {
      return next(new AppError(403, "FORBIDDEN", "No tienes permiso para hacer esto"));
    }
    req.membership = { businessId, role: row.role as BusinessRole };
    next();
  };
}

export function currentBusinessId(req: Express.Request) {
  if (!req.membership) throw new AppError(404, "NOT_FOUND", "Negocio no encontrado");
  return req.membership.businessId;
}
