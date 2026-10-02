import { and, eq } from "drizzle-orm";
import type { Booking } from "@numerito/shared";
import type { Db } from "../../db/client.js";
import { bookingEvents, bookings, customers, payments, webhookEvents } from "../../db/schema/index.js";
import { AppError, notFound } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import type { PaymentProvider, ProviderPayment } from "../../lib/payments/index.js";
import { PG_EXCLUSION_VIOLATION, isPgError } from "../../lib/pg.js";
import { bookingsService } from "../bookings/service.js";

export function paymentsService(db: Db, provider: PaymentProvider, webOrigin: string) {
  const bookingsApi = bookingsService(db);

  /** Creates a checkout for the deposit of a booking that is still on hold. */
  async function startCheckout(booking: Booking) {
    if (booking.status !== "pending_payment" || !booking.expiresAt) {
      throw new AppError(409, "NOT_PAYABLE", "Este turno no tiene una seña pendiente");
    }
    const expiresAt = new Date(booking.expiresAt);
    if (expiresAt <= new Date()) throw new AppError(409, "HOLD_EXPIRED", "Pasaron los minutos para pagar y el turno se liberó");

    const { preferenceId, checkoutUrl } = await provider.createCheckout({
      bookingId: booking.id,
      title: `Seña · ${booking.service.name} · ${booking.business.name}`,
      amountCents: booking.depositCents,
      expiresAt,
      returnUrl: `${webOrigin}/mis-turnos/${booking.id}`,
    });
    await db.insert(payments).values({ bookingId: booking.id, provider: provider.name, preferenceId, amountCents: booking.depositCents });
    return checkoutUrl;
  }

  /**
   * Records what the provider says about a payment and moves the booking accordingly.
   * Safe to call any number of times for the same payment (webhook retries, the client coming back).
   */
  async function applyPayment(payment: ProviderPayment) {
    if (!payment.bookingId) throw new AppError(400, "UNKNOWN_PAYMENT", "El pago no corresponde a un turno");

    await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({ id: bookings.id, status: bookings.status, depositCents: bookings.depositCents })
        .from(bookings)
        .where(eq(bookings.id, payment.bookingId!))
        .for("update");
      if (!booking) throw notFound("Turno no encontrado");

      await tx
        .insert(payments)
        .values({
          bookingId: booking.id,
          provider: provider.name,
          providerPaymentId: payment.id,
          amountCents: payment.amountCents,
          status: payment.status,
          raw: payment.raw,
        })
        .onConflictDoUpdate({
          target: [payments.provider, payments.providerPaymentId],
          set: { status: payment.status, raw: payment.raw },
        });

      if (payment.status === "rejected" && booking.status === "pending_payment") {
        await tx.insert(bookingEvents).values({ bookingId: booking.id, type: "payment_rejected", data: { paymentId: payment.id } });
        return;
      }
      if (payment.status !== "approved" || booking.status === "confirmed") return;

      if (payment.amountCents < booking.depositCents) {
        logger.warn({ paymentId: payment.id, bookingId: booking.id }, "Payment below the deposit amount");
        await tx.insert(bookingEvents).values({ bookingId: booking.id, type: "payment_amount_mismatch", data: { paymentId: payment.id } });
        return;
      }

      if (booking.status === "pending_payment" || booking.status === "expired") {
        try {
          // Paying late still works if nobody took the slot meanwhile; the exclusion constraint decides.
          await tx.transaction((sp) =>
            sp.update(bookings).set({ status: "confirmed", expiresAt: null }).where(eq(bookings.id, booking.id)),
          );
          await tx.insert(bookingEvents).values({ bookingId: booking.id, type: "deposit_paid", data: { paymentId: payment.id } });
        } catch (err) {
          if (!isPgError(err, PG_EXCLUSION_VIOLATION)) throw err;
          await tx.update(bookings).set({ status: "expired" }).where(eq(bookings.id, booking.id));
          await tx.insert(bookingEvents).values({
            bookingId: booking.id,
            type: "paid_after_slot_was_taken",
            data: { paymentId: payment.id, action: "refund manually" },
          });
          logger.error({ paymentId: payment.id, bookingId: booking.id }, "Deposit paid after the slot was taken: refund needed");
        }
      }
    });
  }

  /**
   * Webhook from the provider. Every event is stored once (unique provider + id + type): a retry of an
   * event already processed returns without doing anything. The payment is always re-read from the
   * provider's API instead of trusting the payload.
   */
  async function handleWebhook(event: { externalId: string; type: string; payload: unknown }) {
    const [stored] = await db
      .insert(webhookEvents)
      .values({ provider: provider.name, externalId: event.externalId, type: event.type, payload: event.payload })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });
    if (!stored) return { duplicate: true };

    try {
      await applyPayment(await provider.getPayment(event.externalId));
      await db.update(webhookEvents).set({ processedAt: new Date() }).where(eq(webhookEvents.id, stored.id));
      return { duplicate: false };
    } catch (err) {
      // Forget the event so the provider's retry gets processed.
      await db.delete(webhookEvents).where(eq(webhookEvents.id, stored.id));
      throw err;
    }
  }

  /** The client came back from the checkout with a payment id: confirm without waiting for the webhook. */
  async function handleReturn(userId: string, bookingId: string, paymentId: string) {
    const [owned] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .innerJoin(customers, eq(customers.id, bookings.customerId))
      .where(and(eq(bookings.id, bookingId), eq(customers.userId, userId)));
    if (!owned) throw notFound("Turno no encontrado");

    const payment = await provider.getPayment(paymentId);
    if (payment.bookingId !== bookingId) throw new AppError(400, "PAYMENT_MISMATCH", "Ese pago no corresponde a este turno");
    await applyPayment(payment);
    return bookingsApi.getById(bookingId);
  }

  return { startCheckout, applyPayment, handleWebhook, handleReturn };
}
