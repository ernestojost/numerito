import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { type DbCheck, healthRouter } from "./modules/health/routes.js";

export interface AppDeps {
  checkDb: DbCheck;
}

export function createApp({ checkDb }: AppDeps) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "100kb" }));

  // /health for the platform health check, /api/health for the web app (through the Next rewrite)
  app.use(["/health", "/api/health"], healthRouter(checkDb));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
