import { sql } from "drizzle-orm";
import {
  bigserial,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { BOOKING_STATUSES } from "@numerito/shared";
import { user } from "./auth.js";
import { businesses } from "./businesses.js";
import { services, staff } from "./catalog.js";

/** A client as seen by one business. Manual bookings create customers without an account. */
export const customers = pgTable(
  "customers",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: text()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    name: text().notNull(),
    email: text(),
    phone: text(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customers_business_user_uidx").on(t.businessId, t.userId)],
);

export const bookingStatus = pgEnum("booking_status", BOOKING_STATUSES);
export const bookingSource = pgEnum("booking_source", ["online", "manual"]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Human number printed on the ticket (T-0412). */
    number: bigserial({ mode: "number" }).notNull(),
    businessId: text()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    serviceId: uuid()
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    customerId: uuid()
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    /** What the client sees. */
    endsAt: timestamp({ withTimezone: true }).notNull(),
    /** endsAt + the service's cleanup buffer: what the agenda actually blocks. */
    blocksUntil: timestamp({ withTimezone: true }).notNull(),
    status: bookingStatus().notNull(),
    priceCents: integer().notNull(),
    depositCents: integer().notNull().default(0),
    /** Hold deadline while the deposit is being paid. */
    expiresAt: timestamp({ withTimezone: true }),
    source: bookingSource().notNull(),
    notes: text(),
    cancelledAt: timestamp({ withTimezone: true }),
    cancelReason: text(),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("bookings_staff_starts_idx").on(t.staffId, t.startsAt),
    index("bookings_business_starts_idx").on(t.businessId, t.startsAt),
    index("bookings_customer_idx").on(t.customerId),
    check("bookings_range", sql`${t.startsAt} < ${t.endsAt} and ${t.endsAt} <= ${t.blocksUntil}`),
    // The exclusion constraint that prevents double booking is added in a custom migration
    // (0004_bookings_no_overlap.sql): Drizzle can't express EXCLUDE USING gist.
  ],
);

/** Timeline of a booking: created, confirmed, cancelled, reminder sent… */
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    type: text().notNull(),
    actorUserId: text().references(() => user.id, { onDelete: "set null" }),
    data: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_events_booking_idx").on(t.bookingId)],
);
