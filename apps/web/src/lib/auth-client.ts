import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

// Same origin: Next rewrites /api/auth/* to the Express API, so no baseURL is needed.
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
