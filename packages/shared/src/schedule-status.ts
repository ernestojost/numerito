import type { TimeRange } from "./schemas/catalog.js";

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Weekday (0 = Sunday) and "HH:MM" of an instant, as seen in a time zone. */
export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { weekday: WEEKDAYS[get("weekday")] ?? 0, time: `${get("hour")}:${get("minute")}` };
}

export type OpenStatus =
  | { open: true; until: string }
  | { open: false; next: { weekday: number; start: string; today: boolean } | null };

/** Is the business open right now, and if not, when does it open next (within a week)? */
export function openStatus(hours: TimeRange[], now: Date, timeZone: string): OpenStatus {
  const { weekday, time } = localParts(now, timeZone);
  const sorted = [...hours].sort((a, b) => a.start.localeCompare(b.start));

  const current = sorted.find((r) => r.weekday === weekday && r.start <= time && time < r.end);
  if (current) return { open: true, until: current.end };

  const laterToday = sorted.find((r) => r.weekday === weekday && r.start > time);
  if (laterToday) return { open: false, next: { weekday, start: laterToday.start, today: true } };

  for (let offset = 1; offset <= 7; offset++) {
    const day = (weekday + offset) % 7;
    const first = sorted.find((r) => r.weekday === day);
    if (first) return { open: false, next: { weekday: day, start: first.start, today: false } };
  }
  return { open: false, next: null };
}
