import { Router } from "express";
import { ServiceInputSchema } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import { currentBusinessId, requireBusinessRole } from "../../middleware/requireBusinessRole.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { servicesService } from "./service.js";

export function servicesRouter(db: Db) {
  const router = Router({ mergeParams: true });
  const service = servicesService(db);
  const canRead = [requireAuth, requireBusinessRole(db, "owner", "admin", "member")];
  const canManage = [requireAuth, requireBusinessRole(db, "owner", "admin")];

  router.get("/", ...canRead, async (req, res) => {
    res.json(await service.list(currentBusinessId(req)));
  });

  router.post("/", ...canManage, validateBody(ServiceInputSchema), async (req, res) => {
    res.status(201).json(await service.create(currentBusinessId(req), req.body));
  });

  router.patch("/:serviceId", ...canManage, validateBody(ServiceInputSchema.partial()), async (req, res) => {
    res.json(await service.update(currentBusinessId(req), String(req.params.serviceId), req.body));
  });

  router.delete("/:serviceId", ...canManage, async (req, res) => {
    await service.remove(currentBusinessId(req), String(req.params.serviceId));
    res.status(204).end();
  });

  return router;
}
