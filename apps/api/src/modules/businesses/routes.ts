import { Router } from "express";
import { CreateBusinessSchema, SlugSchema } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import { AppError } from "../../lib/errors.js";
import { currentUser, requireAuth } from "../../middleware/requireAuth.js";
import { validateBody } from "../../middleware/validate.js";
import { businessService } from "./service.js";

export function businessesRouter(db: Db) {
  const router = Router();
  const service = businessService(db);

  router.get("/businesses/slug-available", requireAuth, async (req, res) => {
    const parsed = SlugSchema.safeParse(req.query.slug);
    if (!parsed.success) throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Link inválido");
    res.json({ slug: parsed.data, available: await service.isSlugAvailable(parsed.data) });
  });

  router.post("/businesses", requireAuth, validateBody(CreateBusinessSchema), async (req, res) => {
    const business = await service.create(currentUser(req).id, req.body);
    res.status(201).json(business);
  });

  router.get("/me/businesses", requireAuth, async (req, res) => {
    res.json(await service.listForUser(currentUser(req).id));
  });

  return router;
}
