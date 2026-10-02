import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().optional().transform((v) => v || undefined),
  GOOGLE_CLIENT_SECRET: z.string().optional().transform((v) => v || undefined),
  /** Mercado Pago credentials. Without an access token, deposits go through the simulated checkout. */
  MP_ACCESS_TOKEN: z.string().optional().transform((v) => v || undefined),
  MP_WEBHOOK_SECRET: z.string().optional().transform((v) => v || undefined),
  MP_CURRENCY: z.string().length(3).default("ARS"),
  /** Public URL of this API, for Mercado Pago to send webhooks to. */
  PUBLIC_API_URL: z.url().optional(),
  /** Production without Mercado Pago (a public demo) must opt in to the simulated checkout explicitly. */
  ALLOW_SIMULATED_PAYMENTS: z.stringbool().default(false),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === "production" && !parsed.data.MP_ACCESS_TOKEN && !parsed.data.ALLOW_SIMULATED_PAYMENTS) {
  console.error("MP_ACCESS_TOKEN is required in production (or set ALLOW_SIMULATED_PAYMENTS=true for a demo).");
  process.exit(1);
}

export const env: Env = parsed.data;
