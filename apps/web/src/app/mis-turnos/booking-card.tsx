"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Booking } from "@numerito/shared";
import { Stamp } from "@/components/brand/stamp";
import { Ticket, TicketRule } from "@/components/brand/ticket";
import { Button } from "@/components/ui/button";
import { ApiRequestError, api } from "@/lib/api";
import { capitalize, shortDate, timeOf } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export function BookingCard({ booking, canCancel: withinWindow }: { booking: Booking; canCancel: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tz = booking.business.timezone;
  const live = booking.status === "confirmed" || booking.status === "pending_payment";
  // Only decides whether to offer the button; the API enforces the window.
  const canCancel = live && withinWindow;

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api(`/me/bookings/${booking.id}/cancel`, { method: "POST" });
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "No se pudo cancelar. Prueba de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Ticket as="article" className={cn("px-5 pt-[18px] pb-5", !live && "opacity-75")}>
      <Link href={`/mis-turnos/${booking.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-ink">
        <span className="font-sans text-sm text-muted-ink">{capitalize(shortDate(booking.startsAt, tz))}</span>
        <b className="mt-1 mb-1.5 block font-led text-[40px] leading-none">{timeOf(booking.startsAt, tz)}</b>
        <b>{booking.business.name}</b>
        <br />
        {booking.service.name} · {booking.staff.displayName}
      </Link>
      <Stamp kind={booking.status} className="absolute top-[22px] right-3.5 text-lg" />
      {live && (
        <>
          <TicketRule />
          <div className="flex flex-col gap-2 font-sans">
            {!canCancel ? (
              <p className="text-[13px] text-muted-ink">Ya no se puede cancelar desde la app. Habla con la barbería.</p>
            ) : confirming ? (
              <div role="group" aria-label="Confirmar cancelación" className="flex flex-col gap-2">
                <p className="text-sm text-ink-2">¿Cancelar este turno? El horario queda libre para otra persona.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="destructive" disabled={busy} onClick={() => void cancel()}>
                    {busy ? "Cancelando…" : "Sí, cancelar turno"}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    — Volver
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => setConfirming(true)}>
                  Cancelar
                </Button>
                <span className="text-[13px] text-muted-ink">
                  hasta {shortDate(booking.cancellableUntil, tz)} {timeOf(booking.cancellableUntil, tz)}
                </span>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-signal-ink">
                — {error}
              </p>
            )}
          </div>
        </>
      )}
    </Ticket>
  );
}
