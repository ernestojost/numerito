import "server-only";
import { headers } from "next/headers";
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

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export async function getSession(): Promise<{ user: SessionUser } | null> {
  const res = await serverFetch("/api/auth/get-session");
  if (!res.ok) return null;
  return (await res.json()) as { user: SessionUser } | null;
}

export async function getMyBusinesses(): Promise<Business[]> {
  const res = await serverFetch("/api/v1/me/businesses");
  if (!res.ok) return [];
  return (await res.json()) as Business[];
}
