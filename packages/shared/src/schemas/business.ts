import { z } from "zod";
import { BUSINESS_CATEGORIES, DEFAULT_TIMEZONE } from "../enums.js";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres")
  .max(40, "Máximo 40 caracteres")
  .regex(SLUG_PATTERN, "Solo letras, números y guiones");

export const TimezoneSchema = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat("es", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, "Zona horaria inválida");

export const CreateBusinessSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del negocio").max(80),
  slug: SlugSchema,
  timezone: TimezoneSchema.default(DEFAULT_TIMEZONE),
  category: z.enum(BUSINESS_CATEGORIES).default("barberia"),
});
export type CreateBusinessInput = z.input<typeof CreateBusinessSchema>;

export const BusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  category: z.enum(BUSINESS_CATEGORIES),
  timezone: z.string(),
  role: z.enum(["owner", "admin", "member"]),
});
export type Business = z.infer<typeof BusinessSchema>;

/** Turns "Barbería Don Julio" into "barberia-don-julio". */
export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
