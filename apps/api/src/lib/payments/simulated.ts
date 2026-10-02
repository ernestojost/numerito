import type { CheckoutRequest, PaymentProvider, ProviderPayment } from "./provider.js";

/**
 * Stand-in for Mercado Pago when no credentials are configured (local development, demos, tests).
 * The checkout is a page of the web app with "approve" and "reject" buttons; the payment id it returns
 * encodes the outcome, so no state is kept here: `sim_<bookingId>_<approved|rejected>_<amountCents>`.
 */
export class SimulatedProvider implements PaymentProvider {
  readonly name = "simulated";

  constructor(private readonly webOrigin: string) {}

  async createCheckout(req: CheckoutRequest) {
    const url = new URL("/pago-simulado", this.webOrigin);
    url.searchParams.set("turno", req.bookingId);
    url.searchParams.set("monto", String(req.amountCents));
    url.searchParams.set("volver", req.returnUrl);
    return { preferenceId: `sim_pref_${req.bookingId}`, checkoutUrl: url.toString() };
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    const match = /^sim_([0-9a-f-]{36})_(approved|rejected)_(\d+)$/.exec(paymentId);
    if (!match) throw new Error("Pago simulado inválido");
    return {
      id: paymentId,
      bookingId: match[1]!,
      status: match[2] as "approved" | "rejected",
      amountCents: Number(match[3]),
      raw: { simulated: true },
    };
  }
}

export function simulatedPaymentId(bookingId: string, outcome: "approved" | "rejected", amountCents: number) {
  return `sim_${bookingId}_${outcome}_${amountCents}`;
}
