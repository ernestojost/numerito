import { Router } from "express";
import { env } from "../../config/env.js";
import type { Db } from "../../db/client.js";
import { AppError } from "../../lib/errors.js";
import type { PaymentProvider } from "../../lib/payments/index.js";
import { verifyMercadoPagoSignature } from "../../lib/payments/mercadopago.js";
import { paymentsService } from "./service.js";

/** POST /webhooks/mercadopago — Mercado Pago payment notifications. */
export function webhooksRouter(db: Db, provider: PaymentProvider) {
  const router = Router();
  const service = paymentsService(db, provider, env.WEB_ORIGIN);

  router.post("/mercadopago", async (req, res) => {
    const dataId = String(req.query["data.id"] ?? req.body?.data?.id ?? "");
    const type = String(req.query.type ?? req.body?.type ?? "");

    if (env.MP_WEBHOOK_SECRET) {
      const valid = verifyMercadoPagoSignature({
        secret: env.MP_WEBHOOK_SECRET,
        signature: req.header("x-signature"),
        requestId: req.header("x-request-id"),
        dataId,
      });
      if (!valid) {
        req.log.warn({ dataId }, "Rejected webhook with an invalid signature");
        throw new AppError(401, "INVALID_SIGNATURE", "Firma inválida");
      }
    } else if (env.NODE_ENV === "production") {
      throw new AppError(503, "WEBHOOK_NOT_CONFIGURED", "Falta MP_WEBHOOK_SECRET");
    }

    // Only payment events matter; acknowledge the rest so Mercado Pago stops retrying them.
    if (type !== "payment" || !dataId || provider.name !== "mercadopago") {
      res.status(200).json({ ignored: true });
      return;
    }

    const result = await service.handleWebhook({ externalId: dataId, type, payload: req.body });
    res.status(200).json(result);
  });

  return router;
}
