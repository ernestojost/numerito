import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { BUSINESS_CATEGORIES, DEFAULT_TIMEZONE, DEPOSIT_TYPES } from "@numerito/shared";
import { organization } from "./auth.js";

export const businessCategory = pgEnum("business_category", BUSINESS_CATEGORIES);
export const depositType = pgEnum("deposit_type", DEPOSIT_TYPES);

/** Booking settings of a business. Name and slug live on its Better Auth organization. */
export const businesses = pgTable("businesses", {
  id: text()
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  category: businessCategory().notNull().default("barberia"),
  timezone: text().notNull().default(DEFAULT_TIMEZONE),
  address: text(),
  phone: text(),
  description: text(),
  depositType: depositType().notNull().default("fixed"),
  /** Cents for "fixed", percentage points for "percent". */
  depositValue: integer().notNull().default(300000),
  holdMinutes: integer().notNull().default(10),
  cancellationWindowHours: integer().notNull().default(24),
  slotStepMinutes: integer().notNull().default(15),
  minLeadMinutes: integer().notNull().default(60),
  maxAdvanceDays: integer().notNull().default(30),
  reminderHoursBefore: integer().notNull().default(24),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
