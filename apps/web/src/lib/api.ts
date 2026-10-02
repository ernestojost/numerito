import type { ApiError } from "@numerito/shared";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Browser-side call to the API (same origin, the session cookie goes along). */
export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (json ?? {}) as Partial<ApiError>;
    throw new ApiRequestError(res.status, err.code ?? "ERROR", err.message ?? "Algo salió mal. Prueba de nuevo.", err.details);
  }
  return json as T;
}
