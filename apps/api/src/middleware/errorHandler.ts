import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ApiError } from "@numerito/shared";
import { AppError } from "../lib/errors.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "Ruta no encontrada" } satisfies ApiError);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code, message: err.message, details: err.details } satisfies ApiError);
    return;
  }
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Error interno del servidor" } satisfies ApiError);
};
