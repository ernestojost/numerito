import { Router } from "express";
import { z } from "zod";
import { CreateBookingSchema, ManualBookingSchema, StatusChangeSchema } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import { AppError } from "../../lib/errors.js";
import { currentUser, requireAuth } from "../../middleware/requireAuth.js";
import { currentBusinessId, requireBusinessRole } from "../../middleware/requireBusinessRole.js";
import { validateBody } from "../../middleware/validate.js";
import { bookingsService } from "./service.js";

const RangeQuerySchema = z.object({ from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }) });

/** Client side: book, list and cancel your own bookings. */
export function clientBookingsRouter(db: Db) {
  const router = Router();
  const service = bookingsService(db);

  router.post("/bookings", requireAuth, validateBody(CreateBookingSchema), async (req, res) => {
    const user = currentUser(req);
    res.status(201).json(await service.createOnline(user.id, user.name, user.email, req.body));
  });

  router.get("/me/bookings", requireAuth, async (req, res) => {
    res.json(await service.listForUser(currentUser(req).id));
  });

  router.get("/me/bookings/:bookingId", requireAuth, async (req, res) => {
    const booking = (await service.listForUser(currentUser(req).id)).find((b) => b.id === req.params.bookingId);
    if (!booking) throw new AppError(404, "NOT_FOUND", "Turno no encontrado");
    res.json(booking);
  });

  router.post("/me/bookings/:bookingId/cancel", requireAuth, async (req, res) => {
    res.json(await service.cancelByClient(currentUser(req).id, String(req.params.bookingId)));
  });

  return router;
}

/** Business side: the agenda. Mounted at /businesses/:businessId/bookings. */
export function businessBookingsRouter(db: Db) {
  const router = Router({ mergeParams: true });
  const service = bookingsService(db);
  const canRead = [requireAuth, requireBusinessRole(db, "owner", "admin", "member")];
  const canManage = [requireAuth, requireBusinessRole(db, "owner", "admin")];

  router.get("/", ...canRead, async (req, res) => {
    const range = RangeQuerySchema.safeParse(req.query);
    if (!range.success) throw new AppError(400, "VALIDATION_ERROR", "Indica from y to como fecha ISO");
    res.json(await service.listForBusiness(currentBusinessId(req), new Date(range.data.from), new Date(range.data.to)));
  });

  router.post("/", ...canManage, validateBody(ManualBookingSchema), async (req, res) => {
    res.status(201).json(await service.createManual(currentBusinessId(req), currentUser(req).id, req.body));
  });

  router.post("/:bookingId/status", ...canManage, validateBody(StatusChangeSchema), async (req, res) => {
    res.json(await service.changeStatus(currentBusinessId(req), String(req.params.bookingId), currentUser(req).id, req.body));
  });

  return router;
}
