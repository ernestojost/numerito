import { z } from "zod";

/* ---------- services ---------- */

export const ServiceInputSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del servicio").max(60),
  durationMinutes: z.number().int().min(5, "Mínimo 5 minutos").max(480),
  bufferMinutes: z.number().int().min(0).max(120).default(0),
  priceCents: z.number().int().min(0),
  /** null = use the business default deposit. */
  depositCents: z.number().int().min(0).nullable().default(null),
  active: z.boolean().default(true),
});
export type ServiceInput = z.input<typeof ServiceInputSchema>;

export const ServiceSchema = ServiceInputSchema.extend({
  id: z.string(),
  sortOrder: z.number().int(),
  staffIds: z.array(z.string()),
});
export type Service = z.infer<typeof ServiceSchema>;

/* ---------- staff ---------- */

export const StaffInputSchema = z.object({
  displayName: z.string().trim().min(2, "Escribe el nombre").max(40),
  email: z.email("Email inválido").nullable().default(null),
  active: z.boolean().default(true),
  serviceIds: z.array(z.string()).default([]),
});
export type StaffInput = z.input<typeof StaffInputSchema>;

export const StaffSchema = StaffInputSchema.extend({
  id: z.string(),
  userId: z.string().nullable(),
  sortOrder: z.number().int(),
  /** true when the barber has no schedule of their own and works the business hours. */
  usesBusinessHours: z.boolean(),
});
export type Staff = z.infer<typeof StaffSchema>;

/* ---------- weekly schedules ---------- */

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const TimeSchema = z.string().regex(TIME_PATTERN, "Hora inválida (HH:MM)");

export const TimeRangeSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    start: TimeSchema,
    end: TimeSchema,
  })
  .refine((r) => r.start < r.end, { message: "La hora de inicio tiene que ser antes que la de fin", path: ["end"] });
export type TimeRange = z.infer<typeof TimeRangeSchema>;

/** A full week of opening ranges. Several ranges per day = split shifts. Ranges of a day can't overlap. */
export const WeeklyScheduleSchema = z
  .array(TimeRangeSchema)
  .max(28)
  .superRefine((ranges, ctx) => {
    for (let day = 0; day <= 6; day++) {
      const sorted = ranges.filter((r) => r.weekday === day).sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i]!.start < sorted[i - 1]!.end) {
          ctx.addIssue({ code: "custom", message: `Las franjas del día ${day} se superponen` });
        }
      }
    }
  });
export type WeeklySchedule = z.infer<typeof WeeklyScheduleSchema>;

/* ---------- overrides (blocks and extra openings) ---------- */

export const OVERRIDE_KINDS = ["blocked", "extra_open"] as const;
export type OverrideKind = (typeof OVERRIDE_KINDS)[number];

export const OverrideInputSchema = z
  .object({
    /** null = the whole business. */
    staffId: z.string().nullable().default(null),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    kind: z.enum(OVERRIDE_KINDS).default("blocked"),
    reason: z.string().trim().max(80).nullable().default(null),
  })
  .refine((o) => new Date(o.startsAt) < new Date(o.endsAt), {
    message: "El fin tiene que ser después del inicio",
    path: ["endsAt"],
  });
export type OverrideInput = z.input<typeof OverrideInputSchema>;

export const OverrideSchema = z.object({
  id: z.string(),
  staffId: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  kind: z.enum(OVERRIDE_KINDS),
  reason: z.string().nullable(),
});
export type Override = z.infer<typeof OverrideSchema>;

/* ---------- public business page ---------- */

export const PublicBusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  timezone: z.string(),
  hours: z.array(TimeRangeSchema),
  services: z.array(ServiceSchema.omit({ active: true })),
  staff: z.array(z.object({ id: z.string(), displayName: z.string(), serviceIds: z.array(z.string()) })),
  depositCents: z.number().int(),
});
export type PublicBusiness = z.infer<typeof PublicBusinessSchema>;
