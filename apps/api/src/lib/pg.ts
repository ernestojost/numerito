/** Postgres error codes we map to API errors. */
export const PG_UNIQUE_VIOLATION = "23505";
/** Raised by the bookings_no_overlap exclusion constraint. */
export const PG_EXCLUSION_VIOLATION = "23P01";

export function isPgError(err: unknown, code: string): err is { code: string; constraint_name?: string } {
  const cause = (err as { cause?: unknown })?.cause ?? err;
  return typeof cause === "object" && cause !== null && (cause as { code?: string }).code === code;
}
