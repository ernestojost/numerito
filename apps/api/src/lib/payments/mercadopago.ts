import { createHmac, timingSafeEqual } from "node:crypto";
import type { CheckoutRequest, PaymentProvider, ProviderPayment, ProviderPaymentStatus } from "./provider.js";

const API = "https://api.mercadopago.com";

/** Mercado Pago payment statuses → ours. in_process / authorized are still pending. */
export function normalizeStatus(status: string): ProviderPaymentStatus {
  if (status === "approved") return "approved";
  if (status === "refunded" || status === "charged_back") return "refunded";
  if (status === "rejected" || status === "cancelled") return "rejected";
  return "pending";
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercadopago";

  constructor(
    private readonly accessToken: string,
    private readonly currency: string,
    private readonly notificationUrl: string | undefined,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${this.accessToken}`, "content-type": "application/json", ...init?.headers },
    });
    if (!res.ok) throw new Error(`Mercado Pago ${path} respondió ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  async createCheckout(req: CheckoutRequest) {
    const preference = await this.request<{ id: string; init_point: string; sandbox_init_point?: string }>(
      "/checkout/preferences",
      {
        method: "POST",
        // Same booking → same idempotency key: a retried request doesn't create a second preference.
        headers: { "x-idempotency-key": `${req.bookingId}-${req.expiresAt.getTime()}` },
        body: JSON.stringify({
          items: [{ title: req.title, quantity: 1, unit_price: req.amountCents / 100, currency_id: this.currency }],
          external_reference: req.bookingId,
          back_urls: { success: req.returnUrl, failure: req.returnUrl, pending: req.returnUrl },
          auto_return: "approved",
          notification_url: this.notificationUrl,
          // The checkout can't outlive the hold on the slot.
          expires: true,
          expiration_date_to: req.expiresAt.toISOString(),
          binary_mode: true,
        }),
      },
    );
    const sandbox = this.accessToken.startsWith("TEST-");
    return { preferenceId: preference.id, checkoutUrl: (sandbox && preference.sandbox_init_point) || preference.init_point };
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    const p = await this.request<{ id: number; status: string; external_reference: string | null; transaction_amount: number }>(
      `/v1/payments/${encodeURIComponent(paymentId)}`,
    );
    return {
      id: String(p.id),
      status: normalizeStatus(p.status),
      bookingId: p.external_reference,
      amountCents: Math.round(p.transaction_amount * 100),
      raw: p,
    };
  }
}

const MAX_SIGNATURE_AGE_MS = 5 * 60_000;

/**
 * Verifies the `x-signature` header of a Mercado Pago webhook:
 *   HMAC-SHA256(secret, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;") === v1
 * Rejects stale timestamps so a captured request can't be replayed later.
 */
export function verifyMercadoPagoSignature(input: {
  secret: string;
  signature: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
  now?: number;
}): boolean {
  if (!input.signature || !input.dataId) return false;
  const parts = Object.fromEntries(
    input.signature.split(",").map((part) => part.trim().split("=", 2) as [string, string]),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // Mercado Pago sends ts in milliseconds (older integrations: seconds).
  const tsMs = ts.length > 10 ? Number(ts) : Number(ts) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs((input.now ?? Date.now()) - tsMs) > MAX_SIGNATURE_AGE_MS) return false;

  // Alphanumeric ids are signed in lowercase.
  const id = /^[a-z0-9]+$/i.test(input.dataId) ? input.dataId.toLowerCase() : input.dataId;
  let manifest = `id:${id};`;
  if (input.requestId) manifest += `request-id:${input.requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
