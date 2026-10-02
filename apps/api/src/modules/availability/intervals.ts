import { TZDate } from "@date-fns/tz";

/** Half-open [start, end) in epoch milliseconds. */
export interface Interval {
  start: number;
  end: number;
}

const MINUTE = 60_000;

/** Sorts and merges overlapping or touching intervals. */
export function normalize(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out.at(-1);
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

export const union = (a: Interval[], b: Interval[]) => normalize([...a, ...b]);

/** Removes every part of `base` covered by `remove`. */
export function subtract(base: Interval[], remove: Interval[]): Interval[] {
  const cuts = normalize(remove);
  const out: Interval[] = [];
  for (const b of normalize(base)) {
    let pieces: Interval[] = [b];
    for (const c of cuts) {
      pieces = pieces.flatMap((p) => {
        if (c.end <= p.start || c.start >= p.end) return [p];
        const left = { start: p.start, end: c.start };
        const right = { start: c.end, end: p.end };
        return [left, right].filter((x) => x.end > x.start);
      });
    }
    out.push(...pieces);
  }
  return out;
}

/** "2026-10-01" + "09:30" in a time zone → epoch ms. Handles DST because TZDate resolves the offset per instant. */
export function zonedTime(date: string, time: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new TZDate(y!, m! - 1, d!, hh!, mm!, timeZone).getTime();
}

/** Weekday (0 = Sunday) of a local calendar date. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

/** The local day as an instant range: [00:00, next day 00:00) in the business time zone. */
export function dayBounds(date: string, timeZone: string): Interval {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + 1)).toISOString().slice(0, 10);
  return { start: zonedTime(date, "00:00", timeZone), end: zonedTime(next, "00:00", timeZone) };
}

export interface SlotRules {
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  /** Earliest bookable start (now + minimum lead time). */
  notBefore: number;
  /** Latest bookable start (now + max days ahead). */
  notAfter: number;
}

/**
 * Candidate starts on a fixed grid (every `stepMinutes` from local midnight) where the service plus its
 * cleanup buffer fits entirely inside a free interval.
 */
export function generateSlots(free: Interval[], gridOrigin: number, rules: SlotRules): number[] {
  const step = rules.stepMinutes * MINUTE;
  const needed = (rules.durationMinutes + rules.bufferMinutes) * MINUTE;
  const starts: number[] = [];
  for (const interval of normalize(free)) {
    let t = gridOrigin + Math.ceil((interval.start - gridOrigin) / step) * step;
    for (; t + needed <= interval.end; t += step) {
      if (t >= rules.notBefore && t <= rules.notAfter) starts.push(t);
    }
  }
  return starts;
}
