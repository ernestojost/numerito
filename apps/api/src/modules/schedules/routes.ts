import { Router } from "express";
import { OverrideInputSchema, WeeklyScheduleSchema } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import { currentBusinessId, requireBusinessRole } from "../../middleware/requireBusinessRole.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { schedulesService } from "./service.js";

export function schedulesRouter(db: Db) {
  const router = Router({ mergeParams: true });
  const service = schedulesService(db);
  const canRead = [requireAuth, requireBusinessRole(db, "owner", "admin", "member")];
  const canManage = [requireAuth, requireBusinessRole(db, "owner", "admin")];

  router.get("/hours", ...canRead, async (req, res) => {
    res.json(await service.getBusinessHours(currentBusinessId(req)));
  });

  router.put("/hours", ...canManage, validateBody(WeeklyScheduleSchema), async (req, res) => {
    res.json(await service.setBusinessHours(currentBusinessId(req), req.body));
  });

  router.get("/staff/:staffId/schedule", ...canRead, async (req, res) => {
    res.json(await service.getStaffSchedule(currentBusinessId(req), String(req.params.staffId)));
  });

  router.put("/staff/:staffId/schedule", ...canManage, validateBody(WeeklyScheduleSchema), async (req, res) => {
    res.json(await service.setStaffSchedule(currentBusinessId(req), String(req.params.staffId), req.body));
  });

  router.get("/overrides", ...canRead, async (req, res) => {
    res.json(await service.listOverrides(currentBusinessId(req)));
  });

  router.post("/overrides", ...canManage, validateBody(OverrideInputSchema), async (req, res) => {
    res.status(201).json(await service.createOverride(currentBusinessId(req), req.body));
  });

  router.delete("/overrides/:overrideId", ...canManage, async (req, res) => {
    await service.removeOverride(currentBusinessId(req), String(req.params.overrideId));
    res.status(204).end();
  });

  return router;
}
