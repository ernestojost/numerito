import { z } from "zod";
import { BOOKING_STATUSES } from "../enums.js";

export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)");

export const AvailabilityQuerySchema = z.object({
  serviceId: z.uuid(),
  /** Local date in the business time zone. */
  date: DateSchema,
  /** Omit for "any barber". */
  staffId: z.uuid().optional(),
});
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

export const SlotSchema = z.object({
  startsAt: z.string(),
  endsAt: z.string(),
  /** Barbers free at that time (one when a barber was requested). */
  staffIds: z.array(z.string()),
});
export type Slot = z.infer<typeof SlotSchema>;

export const AvailabilitySchema = z.object({
  date: DateSchema,
  timezone: z.string(),
  slots: z.array(SlotSchema),
});
export type Availability = z.infer<typeof AvailabilitySchema>;

export const CreateBookingSchema = z.object({
  businessSlug: z.string(),
  serviceId: z.uuid(),
  /** null = any barber who is free. */
  staffId: z.uuid().nullable().default(null),
  startsAt: z.iso.datetime({ offset: true }),
});
export type CreateBookingInput = z.input<typeof CreateBookingSchema>;

export const ManualBookingSchema = z.object({
  serviceId: z.uuid(),
  staffId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  customer: z.object({
    name: z.string().trim().min(2, "Escribe el nombre del cliente").max(80),
    phone: z.string().trim().max(30).nullable().default(null),
  }),
  notes: z.string().trim().max(200).nullable().default(null),
});
export type ManualBookingInput = z.input<typeof ManualBookingSchema>;

/** Status changes the business can make from the agenda. */
export const BUSINESS_STATUS_ACTIONS = ["completed", "no_show", "cancelled_by_business"] as const;
export const StatusChangeSchema = z.object({
  status: z.enum(BUSINESS_STATUS_ACTIONS),
  reason: z.string().trim().max(200).nullable().default(null),
});

export const BookingSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.enum(BOOKING_STATUSES),
  startsAt: z.string(),
  endsAt: z.string(),
  priceCents: z.number().int(),
  depositCents: z.number().int(),
  source: z.enum(["online", "manual"]),
  business: z.object({ id: z.string(), name: z.string(), slug: z.string(), timezone: z.string() }),
  service: z.object({ id: z.string(), name: z.string(), durationMinutes: z.number().int() }),
  staff: z.object({ id: z.string(), displayName: z.string() }),
  customer: z.object({ id: z.string(), name: z.string(), phone: z.string().nullable() }),
  /** Until when the client can cancel from the app. */
  cancellableUntil: z.string(),
  notes: z.string().nullable(),
});
export type Booking = z.infer<typeof BookingSchema>;
