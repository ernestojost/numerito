import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type Session } from "../auth/index.js";
import { AppError } from "../lib/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: Session;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return next(new AppError(401, "UNAUTHENTICATED", "Tienes que iniciar sesión"));
  req.auth = session;
  next();
};

/** Narrow helper for handlers mounted after requireAuth. */
export function currentUser(req: Express.Request) {
  if (!req.auth) throw new AppError(401, "UNAUTHENTICATED", "Tienes que iniciar sesión");
  return req.auth.user;
}
