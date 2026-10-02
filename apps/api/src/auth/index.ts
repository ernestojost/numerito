import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import * as schema from "../db/schema/index.js";

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : undefined;

export const auth = betterAuth({
  appName: "Numerito",
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_ORIGIN],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: false }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: google,
  // Each business is an organization; its barbers are members.
  plugins: [organization({ allowUserToCreateOrganization: true })],
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },
});

export type Session = typeof auth.$Infer.Session;
