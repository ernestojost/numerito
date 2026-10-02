import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import type { Business } from "@numerito/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Calls the Express API from a Server Component, forwarding the user's cookies. */
export async function serverFetch(path: string, init?: RequestInit) {
  const cookie = (await headers()).get("cookie") ?? "";
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, cookie },
    cache: "no-store",
  });
}

/** GET a JSON resource from /api/v1; null on 404. */
export async function serverJson<T>(path: string): Promise<T | null> {
  const res = await serverFetch(`/api/v1${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

// cache(): layout and page share one request per render.
export const getSession = cache(async (): Promise<{ user: SessionUser } | null> => {
  const res = await serverFetch("/api/auth/get-session");
  if (!res.ok) return null;
  return (await res.json()) as { user: SessionUser } | null;
});

export const getMyBusinesses = cache(async (): Promise<Business[]> => {
  const res = await serverFetch("/api/v1/me/businesses");
  if (!res.ok) return [];
  return (await res.json()) as Business[];
});

export async function getBusiness(businessId: string) {
  return (await getMyBusinesses()).find((b) => b.id === businessId) ?? null;
}
