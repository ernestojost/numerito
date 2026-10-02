import { env } from "../../config/env.js";
import { MercadoPagoProvider } from "./mercadopago.js";
import type { PaymentProvider } from "./provider.js";
import { SimulatedProvider } from "./simulated.js";

export type { PaymentProvider, ProviderPayment } from "./provider.js";

/** Mercado Pago when an access token is configured, the simulated checkout otherwise. */
export function createPaymentProvider(): PaymentProvider {
  if (env.MP_ACCESS_TOKEN) {
    const notificationUrl = env.PUBLIC_API_URL ? `${env.PUBLIC_API_URL}/api/v1/webhooks/mercadopago` : undefined;
    return new MercadoPagoProvider(env.MP_ACCESS_TOKEN, env.MP_CURRENCY, notificationUrl);
  }
  return new SimulatedProvider(env.WEB_ORIGIN);
}
