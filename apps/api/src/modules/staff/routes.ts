import { Router } from "express";
import { StaffInputSchema } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import { currentBusinessId, requireBusinessRole } from "../../middleware/requireBusinessRole.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { staffService } from "./service.js";

export function staffRouter(db: Db) {
  const router = Router({ mergeParams: true });
  const service = staffService(db);
  const canRead = [requireAuth, requireBusinessRole(db, "owner", "admin", "member")];
  const canManage = [requireAuth, requireBusinessRole(db, "owner", "admin")];

  router.get("/", ...canRead, async (req, res) => {
    res.json(await service.list(currentBusinessId(req)));
  });

  router.post("/", ...canManage, validateBody(StaffInputSchema), async (req, res) => {
    res.status(201).json(await service.create(currentBusinessId(req), req.body));
  });

  router.patch("/:staffId", ...canManage, validateBody(StaffInputSchema.partial()), async (req, res) => {
    res.json(await service.update(currentBusinessId(req), String(req.params.staffId), req.body));
  });

  router.delete("/:staffId", ...canManage, async (req, res) => {
    await service.remove(currentBusinessId(req), String(req.params.staffId));
    res.status(204).end();
  });

  return router;
}
