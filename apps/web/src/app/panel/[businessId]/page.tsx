import type { Metadata } from "next";
import { TZDate } from "@date-fns/tz";
import type { Booking, Service, Staff, TimeRange } from "@numerito/shared";
import { getBusiness, serverJson } from "@/lib/server-api";
import { AgendaBoard, type AgendaColumn } from "./agenda-board";

export const metadata: Metadata = { title: "Agenda · Numerito" };

function zoned(date: string, time: string, timeZone: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new TZDate(y!, m! - 1, d!, hh!, mm!, timeZone);
}

function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export default async function AgendaPage({ params, searchParams }: PageProps<"/panel/[businessId]">) {
  const { businessId } = await params;
  const query = await searchParams;
  const business = await getBusiness(businessId);
  if (!business) return null;

  const tz = business.timezone;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const date = typeof query.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.fecha) ? query.fecha : today;
  const from = zoned(date, "00:00", tz).toISOString();
  const to = zoned(shiftDate(date, 1), "00:00", tz).toISOString();

  const [staff, services, hours, bookings] = await Promise.all([
    serverJson<Staff[]>(`/businesses/${businessId}/staff`),
    serverJson<Service[]>(`/businesses/${businessId}/services`),
    serverJson<TimeRange[]>(`/businesses/${businessId}/hours`),
    serverJson<Booking[]>(`/businesses/${businessId}/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  ]);

  const weekday = weekdayOf(date);
  const businessDay = (hours ?? []).filter((h) => h.weekday === weekday);
  const activeStaff = (staff ?? []).filter((s) => s.active);
  const columns: AgendaColumn[] = await Promise.all(
    activeStaff.map(async (member) => {
      const own = member.usesBusinessHours
        ? []
        : ((await serverJson<TimeRange[]>(`/businesses/${businessId}/staff/${member.id}/schedule`)) ?? []);
      const working = (own.length ? own : businessDay).filter((r) => r.weekday === weekday);
      return {
        id: member.id,
        name: member.displayName,
        working: working.map((r) => ({ start: r.start, end: r.end })),
      };
    }),
  );

  return (
    <AgendaBoard
      businessId={businessId}
      timezone={tz}
      date={date}
      today={today}
      prevDate={shiftDate(date, -1)}
      nextDate={shiftDate(date, 1)}
      columns={columns}
      bookings={bookings ?? []}
      services={(services ?? []).filter((s) => s.active)}
    />
  );
}
