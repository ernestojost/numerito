import "server-only";
import { cache } from "react";
import type { PublicBusiness } from "@numerito/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Public catalog of a business; no session needed. */
export const getPublicBusiness = cache(async (slug: string): Promise<PublicBusiness | null> => {
  const res = await fetch(`${API_URL}/api/v1/public/businesses/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Public business ${slug} failed with ${res.status}`);
  return (await res.json()) as PublicBusiness;
});
