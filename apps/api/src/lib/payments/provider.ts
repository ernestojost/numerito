export type ProviderPaymentStatus = "pending" | "approved" | "rejected" | "refunded";

export interface CheckoutRequest {
  bookingId: string;
  title: string;
  amountCents: number;
  expiresAt: Date;
  /** Where the client lands after paying (or giving up). */
  returnUrl: string;
}

export interface ProviderPayment {
  id: string;
  status: ProviderPaymentStatus;
  /** Our booking id, sent as external_reference when the checkout was created. */
  bookingId: string | null;
  amountCents: number;
  raw: unknown;
}

/** What the rest of the API needs from a payment provider. */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(req: CheckoutRequest): Promise<{ preferenceId: string; checkoutUrl: string }>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
}
