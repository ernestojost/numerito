import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { OVERRIDE_KINDS } from "@numerito/shared";
import { user } from "./auth.js";
import { businesses } from "./businesses.js";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const services = pgTable(
  "services",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: text()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text().notNull(),
    durationMinutes: integer().notNull(),
    /** Cleanup time after the service: blocks the agenda, the client doesn't see it. */
    bufferMinutes: integer().notNull().default(0),
    priceCents: integer().notNull(),
    /** null = the business default deposit. */
    depositCents: integer(),
    active: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("services_business_idx").on(t.businessId),
    check("services_duration_positive", sql`${t.durationMinutes} > 0`),
    check("services_money_non_negative", sql`${t.priceCents} >= 0 and coalesce(${t.depositCents}, 0) >= 0`),
  ],
);

export const staff = pgTable(
  "staff",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: text()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** Set once the barber has an account; a barber can exist without one. */
    userId: text().references(() => user.id, { onDelete: "set null" }),
    displayName: text().notNull(),
    email: text(),
    active: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("staff_business_idx").on(t.businessId)],
);

export const staffServices = pgTable(
  "staff_services",
  {
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    serviceId: uuid()
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.staffId, t.serviceId] })],
);

/** Opening hours per weekday (0 = Sunday), in the business time zone. Several rows per day = split shifts. */
export const businessHours = pgTable(
  "business_hours",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: text()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
    opensAt: time().notNull(),
    closesAt: time().notNull(),
  },
  (t) => [
    index("business_hours_business_idx").on(t.businessId, t.weekday),
    check("business_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check("business_hours_range", sql`${t.opensAt} < ${t.closesAt}`),
  ],
);

/** A barber's own hours. No rows = the barber works the business hours. */
export const staffSchedules = pgTable(
  "staff_schedules",
  {
    id: uuid().primaryKey().defaultRandom(),
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
    startsAt: time().notNull(),
    endsAt: time().notNull(),
  },
  (t) => [
    index("staff_schedules_staff_idx").on(t.staffId, t.weekday),
    check("staff_schedules_weekday", sql`${t.weekday} between 0 and 6`),
    check("staff_schedules_range", sql`${t.startsAt} < ${t.endsAt}`),
  ],
);

export const overrideKind = pgEnum("override_kind", OVERRIDE_KINDS);

/** One-off changes: holidays, vacations, "today I leave at 15", or extra opening hours. */
export const scheduleOverrides = pgTable(
  "schedule_overrides",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: text()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** null = applies to the whole business. */
    staffId: uuid().references(() => staff.id, { onDelete: "cascade" }),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    kind: overrideKind().notNull().default("blocked"),
    reason: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("schedule_overrides_business_idx").on(t.businessId, t.startsAt),
    check("schedule_overrides_range", sql`${t.startsAt} < ${t.endsAt}`),
  ],
);
