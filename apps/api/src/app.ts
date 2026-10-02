import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/index.js";
import { env } from "./config/env.js";
import { db as defaultDb, type Db } from "./db/client.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { businessBookingsRouter, clientBookingsRouter } from "./modules/bookings/routes.js";
import { businessesRouter } from "./modules/businesses/routes.js";
import { type DbCheck, healthRouter } from "./modules/health/routes.js";
import { publicRouter } from "./modules/public/routes.js";
import { schedulesRouter } from "./modules/schedules/routes.js";
import { servicesRouter } from "./modules/services/routes.js";
import { staffRouter } from "./modules/staff/routes.js";

export interface AppDeps {
  checkDb: DbCheck;
  db?: Db;
}

export function createApp({ checkDb, db = defaultDb }: AppDeps) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger }));

  // Better Auth reads the raw body itself, so it goes before express.json().
  app.all("/api/auth/{*any}", toNodeHandler(auth));

  app.use(express.json({ limit: "100kb" }));

  // /health for the platform health check, /api/health for the web app (through the Next rewrite)
  app.use(["/health", "/api/health"], healthRouter(checkDb));
  app.use("/api/v1", businessesRouter(db));
  app.use("/api/v1/businesses/:businessId/services", servicesRouter(db));
  app.use("/api/v1/businesses/:businessId/staff", staffRouter(db));
  app.use("/api/v1/businesses/:businessId/bookings", businessBookingsRouter(db));
  app.use("/api/v1/businesses/:businessId", schedulesRouter(db));
  app.use("/api/v1/public", publicRouter(db));
  app.use("/api/v1", clientBookingsRouter(db));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
