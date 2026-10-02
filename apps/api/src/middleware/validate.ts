import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.js";

/** Parses req.body with the schema and replaces it with the parsed value. */
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, "VALIDATION_ERROR", "Datos inválidos", z.flattenError(parsed.error).fieldErrors));
    }
    req.body = parsed.data;
    next();
  };
}
