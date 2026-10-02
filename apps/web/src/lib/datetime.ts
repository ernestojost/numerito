/** Every date shown to a client or owner is in the business time zone, never the browser's. */

export function timeOf(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(new Date(iso));
}

/** "jueves 1 de octubre de 2026" */
export function longDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone }).format(new Date(iso));
}

/** "jue 1 oct" */
export function shortDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short", timeZone })
    .format(new Date(iso))
    .replace(/\./g, "");
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const WEEKDAY_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

/** The next `count` local dates starting today, as YYYY-MM-DD with their weekday. */
export function nextDays(timeZone: string, count: number, from = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(from);
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y!, m! - 1, d! + i));
    return {
      date: date.toISOString().slice(0, 10),
      weekday: date.getUTCDay(),
      label: WEEKDAY_SHORT[date.getUTCDay()]!,
      day: date.getUTCDate(),
      month: new Intl.DateTimeFormat("es", { month: "long", timeZone: "UTC" }).format(date),
      year: date.getUTCFullYear(),
    };
  });
}
