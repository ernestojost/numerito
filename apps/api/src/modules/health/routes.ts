import { Router } from "express";
import type { HealthResponse } from "@numerito/shared";

export type DbCheck = () => Promise<boolean>;

export function healthRouter(checkDb: DbCheck) {
  const router = Router();

  router.get("/", async (_req, res) => {
    const dbOk = await checkDb().catch(() => false);
    const body: HealthResponse = { status: "ok", db: dbOk ? "ok" : "down", uptime: process.uptime() };
    res.status(dbOk ? 200 : 503).json(body);
  });

  return router;
}
