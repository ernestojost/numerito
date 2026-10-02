import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { bookings } from "./bookings.js";

export const paymentStatus = pgEnum("payment_status", ["pending", "approved", "rejected", "refunded"]);

/** A deposit payment attempt for a booking. */
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    provider: text().notNull(),
    /** Checkout preference (Mercado Pago) the client was sent to. */
    preferenceId: text(),
    /** Set once the provider reports an actual payment. */
    providerPaymentId: text(),
    amountCents: integer().notNull(),
    status: paymentStatus().notNull().default("pending"),
    raw: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("payments_booking_idx").on(t.bookingId),
    uniqueIndex("payments_provider_payment_uidx").on(t.provider, t.providerPaymentId),
  ],
);

/**
 * Every notification received from a payment provider. The unique key makes processing idempotent:
 * providers retry, and the same event must never confirm or charge twice.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    provider: text().notNull(),
    externalId: text().notNull(),
    type: text().notNull(),
    payload: jsonb(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp({ withTimezone: true }),
    error: text(),
  },
  (t) => [uniqueIndex("webhook_events_dedupe_uidx").on(t.provider, t.externalId, t.type)],
);
