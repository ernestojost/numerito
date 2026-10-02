import type { OpenStatus, TimeRange } from "@numerito/shared";

const SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "09:00" → "9", "09:30" → "9:30" (for summaries). */
const compact = (t: string) => (t.endsWith(":00") ? String(Number(t.slice(0, 2))) : t.replace(/^0/, ""));
/** "09:00" → "9:00" (for the LED). */
const clock = (t: string) => t.replace(/^0/, "");
const rangeText = (ranges: TimeRange[]) => ranges.map((r) => `${compact(r.start)}–${compact(r.end)}`).join(" y ");

/** [{lun 9-13, 16-20}, ..., {sáb 9-14}] → "Lun a vie 9–13 y 16–20 · Sáb 9–14". */
export function summarizeHours(hours: TimeRange[]) {
  const byDay = new Map<number, string>();
  for (const day of ORDER) {
    const ranges = hours.filter((r) => r.weekday === day).sort((a, b) => a.start.localeCompare(b.start));
    if (ranges.length) byDay.set(day, rangeText(ranges));
  }

  const groups: { days: number[]; text: string }[] = [];
  for (const day of ORDER) {
    const text = byDay.get(day);
    if (!text) continue;
    const last = groups.at(-1);
    const prevDay = last?.days.at(-1);
    const consecutive = prevDay !== undefined && ORDER.indexOf(day) === ORDER.indexOf(prevDay) + 1;
    if (last && last.text === text && consecutive) last.days.push(day);
    else groups.push({ days: [day], text });
  }

  return groups
    .map(({ days, text }) => {
      const first = SHORT[days[0]!]!;
      const label = days.length === 1 ? first : `${first} a ${SHORT[days.at(-1)!]}`;
      return `${label[0]!.toUpperCase()}${label.slice(1)} ${text}`;
    })
    .join(" · ");
}

/** LED text: "ABIERTO · HASTA 20:00" or "CERRADO · ABRE VIE 9:00". */
export function statusLabel(status: OpenStatus) {
  if (status.open) return `ABIERTO · HASTA ${clock(status.until)}`;
  if (!status.next) return "CERRADO";
  const when = status.next.today ? "HOY" : SHORT[status.next.weekday]!.toUpperCase();
  return `CERRADO · ABRE ${when} ${clock(status.next.start)}`;
}
