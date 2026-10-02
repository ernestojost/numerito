export const BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled_by_client",
  "cancelled_by_business",
  "no_show",
  "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that occupy a slot in the agenda. */
export const BLOCKING_STATUSES = ["pending_payment", "confirmed"] as const satisfies readonly BookingStatus[];

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

export const BUSINESS_CATEGORIES = ["barberia", "peluqueria", "otro"] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const DEPOSIT_TYPES = ["none", "fixed", "percent"] as const;
export type DepositType = (typeof DEPOSIT_TYPES)[number];
