"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Booking, BookingStatus, Service } from "@numerito/shared";
import { LedChip } from "@/components/brand/led";
import { Button, buttonVariants } from "@/components/ui/button";
import { capitalize, longDate, timeOf } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { BookingDrawer } from "./booking-drawer";
import { ManualBookingPanel } from "./manual-booking-panel";

export interface AgendaColumn {
  id: string;
  name: string;
  working: { start: string; end: string }[];
}

const PX_PER_MINUTE = 64 / 60;
const LIVE: BookingStatus[] = ["confirmed", "pending_payment"];

export const STATUS_BADGE: Record<BookingStatus, { text: string; className: string }> = {
  pending_payment: { text: "Retenido", className: "border-[1.5px] border-dashed border-ink" },
  confirmed: { text: "Confirmado", className: "bg-ok-soft text-ok" },
  completed: { text: "Atendido", className: "bg-ink text-paper" },
  cancelled_by_client: { text: "Cancelado", className: "bg-signal-soft text-signal-ink" },
  cancelled_by_business: { text: "Cancelado", className: "bg-signal-soft text-signal-ink" },
  no_show: { text: "No vino", className: "bg-signal-soft text-signal-ink" },
  expired: { text: "Vencido", className: "border-[1.5px] border-machine text-muted-ink" },
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const badge = STATUS_BADGE[status];
  return (
    <span className={cn("inline-flex min-h-5 items-center rounded-[2px] px-1.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase", badge.className, className)}>
      {badge.text}
    </span>
  );
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** The current time in the business zone, updated every minute (client only). */
function useNow(timezone: string) {
  const [now, setNow] = useState<{ ms: number; hhmm: string } | null>(null);
  useEffect(() => {
    const tick = () => setNow({ ms: Date.now(), hhmm: timeOf(new Date().toISOString(), timezone) });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timezone]);
  return now;
}

export function AgendaBoard({
  businessId,
  timezone,
  date,
  today,
  prevDate,
  nextDate,
  columns,
  bookings,
  services,
}: {
  businessId: string;
  timezone: string;
  date: string;
  today: string;
  prevDate: string;
  nextDate: string;
  columns: AgendaColumn[];
  bookings: Booking[];
  services: Service[];
}) {
  const [showCancelled, setShowCancelled] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const now = useNow(timezone);
  const isToday = date === today;
  const base = `/panel/${businessId}`;

  const visible = bookings.filter((b) => showCancelled || (b.status !== "cancelled_by_client" && b.status !== "cancelled_by_business" && b.status !== "expired"));
  const local = (iso: string) => minutesOf(timeOf(iso, timezone));

  // The grid spans the working hours of the day (09–20 when nobody works), widened to fit every booking.
  const starts = [...columns.flatMap((c) => c.working.map((w) => minutesOf(w.start))), ...visible.map((b) => local(b.startsAt))];
  const ends = [...columns.flatMap((c) => c.working.map((w) => minutesOf(w.end))), ...visible.map((b) => local(b.endsAt))];
  const dayStart = Math.floor((starts.length ? Math.min(...starts) : 9 * 60) / 60) * 60;
  const dayEnd = Math.ceil((ends.length ? Math.max(...ends) : 20 * 60) / 60) * 60;
  const height = (dayEnd - dayStart) * PX_PER_MINUTE;
  const y = (minutes: number) => (minutes - dayStart) * PX_PER_MINUTE;
  const hourMarks = Array.from({ length: (dayEnd - dayStart) / 60 + 1 }, (_, i) => dayStart + i * 60);

  const nowMinutes = now && isToday ? minutesOf(now.hhmm) : null;
  const upcoming = visible.filter((b) => LIVE.includes(b.status) && (!now || new Date(b.endsAt).getTime() > now.ms));
  const opened = bookings.find((b) => b.id === openId) ?? null;

  return (
    <main className="px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="font-display text-[32px] leading-none uppercase">Agenda</h1>
        <div className="flex items-center gap-1">
          <Link href={`${base}?fecha=${prevDate}`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Día anterior">
            ‹
          </Link>
          <Link href={base} className={cn("inline-flex min-h-9 items-center rounded-[2px] border-[1.5px] border-ink px-3.5 text-sm font-bold", isToday && "bg-ink text-paper")}>
            Hoy
          </Link>
          <Link href={`${base}?fecha=${nextDate}`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Día siguiente">
            ›
          </Link>
        </div>
        <b className="text-base">{capitalize(longDate(`${date}T12:00:00Z`, "UTC").replace(/ de \d{4}$/, ""))}</b>
        <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
          {now && isToday && (
            <span className="flex items-center gap-2.5 rounded-lg bg-led px-3 py-2 shadow-[inset_0_0_0_3px_var(--color-led-frame)]">
              <span className="text-[11px] font-bold tracking-[.16em] text-led-off uppercase">Ahora</span>
              <span className="led-glow font-led text-2xl leading-none font-bold">{now.hhmm}</span>
            </span>
          )}
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-ink" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Ver cancelados
          </label>
          <Button className="ml-auto sm:ml-0" onClick={() => setCreating(true)} disabled={columns.length === 0 || services.length === 0}>
            + Reserva manual
          </Button>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="mt-10 text-muted-ink">
          Agrega barberos y servicios para empezar a recibir turnos.{" "}
          <Link href={`${base}/barberos`} className="font-bold text-ink underline underline-offset-4">
            Ir a Barberos
          </Link>
        </p>
      ) : (
        <>
          {/* Desktop: one column per barber on a time grid */}
          <div className="mt-6 hidden lg:block">
            <div className="grid gap-3" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0, 1fr))` }}>
              <span />
              {columns.map((c) => (
                <div key={c.id} className="flex h-11 items-center gap-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">{c.name.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <b className="text-sm">{c.name}</b>
                    <br />
                    <span className="text-xs text-muted-ink">{c.working.length ? c.working.map((w) => `${w.start.replace(/^0/, "")}–${w.end.replace(/^0/, "")}`).join(" · ") : "No trabaja"}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="relative mt-2 grid gap-3" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0, 1fr))`, height }}>
              <div className="relative font-ticket text-xs text-muted-ink">
                {hourMarks.map((m) => (
                  <span key={m} className="absolute -translate-y-1/2" style={{ top: y(m) }}>
                    {String(m / 60).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
              {columns.map((c) => (
                <div
                  key={c.id}
                  className="relative border-t border-machine"
                  style={{ backgroundImage: "repeating-linear-gradient(#0000 0 63px, rgba(185,183,176,.6) 63px 64px)" }}
                >
                  {/* Hatched = not working */}
                  {closedRanges(c.working, dayStart, dayEnd).map(([a, b]) => (
                    <div key={a} className="hatch absolute inset-x-0" style={{ top: y(a), height: (b - a) * PX_PER_MINUTE }} aria-hidden />
                  ))}
                  {visible
                    .filter((b) => b.staff.id === c.id)
                    .map((b) => {
                      const top = y(local(b.startsAt));
                      const h = Math.max(40, (local(b.endsAt) - local(b.startsAt)) * PX_PER_MINUTE);
                      const live = now && LIVE.includes(b.status) && new Date(b.startsAt).getTime() <= now.ms && now.ms < new Date(b.endsAt).getTime();
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setOpenId(b.id)}
                          className={cn(
                            "ticket absolute inset-x-1 flex items-start justify-between gap-2 overflow-hidden px-2.5 py-1.5 text-left text-xs outline-none hover:shadow-[0_14px_28px_rgba(0,0,0,.16)] focus-visible:ring-2 focus-visible:ring-ink",
                            !LIVE.includes(b.status) && "opacity-80",
                            live && "pl-3.5 shadow-[inset_4px_0_0_var(--color-led-on),0_10px_24px_rgba(0,0,0,.12)]",
                          )}
                          style={{ top, height: h }}
                        >
                          <span className="min-w-0">
                            <b>{timeOf(b.startsAt, timezone)}</b> {b.customer.name}
                            <br />
                            <span className="text-muted-ink">{b.service.name}</span>
                            {live && (
                              <>
                                <br />
                                <LedChip className="mt-0.5 text-[10px]">EN CURSO</LedChip>
                              </>
                            )}
                          </span>
                          <StatusBadge status={b.status} />
                        </button>
                      );
                    })}
                </div>
              ))}
              {nowMinutes !== null && nowMinutes >= dayStart && nowMinutes <= dayEnd && (
                <div className="pointer-events-none absolute right-0 left-[56px] border-t-2 border-led-on" style={{ top: y(nowMinutes) }} aria-hidden>
                  <LedChip className="absolute -top-3 -left-[60px] text-xs">{now?.hhmm}</LedChip>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: chronological list */}
          <div className="mt-5 flex flex-col gap-2.5 lg:hidden">
            {upcoming.length > 0 && isToday && <p className="text-sm text-muted-ink">{upcoming.length === 1 ? "1 turno más hoy" : `${upcoming.length} turnos más hoy`}</p>}
            {visible.length === 0 && <p className="py-8 text-center text-muted-ink">Sin turnos este día.</p>}
            {visible.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setOpenId(b.id)}
                className={cn("ticket grid min-h-[76px] grid-cols-[76px_1fr_auto] items-center gap-2.5 px-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink", !LIVE.includes(b.status) && "opacity-75")}
              >
                <b className="font-led text-[28px] leading-none">{timeOf(b.startsAt, timezone)}</b>
                <span className="text-[13.5px]">
                  <b>{b.customer.name}</b>
                  <br />
                  {b.service.name} · {b.staff.displayName}
                </span>
                <StatusBadge status={b.status} />
              </button>
            ))}
          </div>
        </>
      )}

      {opened && <BookingDrawer businessId={businessId} booking={opened} nowMs={now?.ms ?? null} onClose={() => setOpenId(null)} />}
      {creating && (
        <ManualBookingPanel
          businessId={businessId}
          timezone={timezone}
          date={date}
          staff={columns.map((c) => ({ id: c.id, name: c.name }))}
          services={services}
          onClose={() => setCreating(false)}
        />
      )}
    </main>
  );
}

/** Gaps of a day not covered by the working ranges, in minutes. */
function closedRanges(working: { start: string; end: string }[], dayStart: number, dayEnd: number): [number, number][] {
  const ranges = working.map((w) => [minutesOf(w.start), minutesOf(w.end)] as const).sort((a, b) => a[0] - b[0]);
  const gaps: [number, number][] = [];
  let cursor = dayStart;
  for (const [a, b] of ranges) {
    if (a > cursor) gaps.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < dayEnd) gaps.push([cursor, dayEnd]);
  return gaps;
}
