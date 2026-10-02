"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Booking } from "@numerito/shared";
import { Stamp } from "@/components/brand/stamp";
import { Ticket, TicketRule } from "@/components/brand/ticket";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/ui/side-panel";
import { ApiRequestError, api } from "@/lib/api";
import { capitalize, shortDate, timeOf } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";

type Action = "completed" | "no_show" | "cancelled_by_business";

export function BookingDrawer({
  businessId,
  booking,
  nowMs,
  onClose,
}: {
  businessId: string;
  booking: Booking;
  nowMs: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tz = booking.business.timezone;
  const live = booking.status === "confirmed" || booking.status === "pending_payment";
  const started = nowMs !== null && new Date(booking.startsAt).getTime() <= nowMs;

  async function act(status: Action) {
    setBusy(status);
    setError(null);
    try {
      await api(`/businesses/${businessId}/bookings/${booking.id}/status`, { method: "POST", body: { status } });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "No se pudo actualizar. Prueba de nuevo.");
      setBusy(null);
    }
  }

  return (
    <SidePanel
      title="Turno"
      onClose={onClose}
      footer={
        live ? (
          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={busy !== null || booking.status !== "confirmed"} onClick={() => void act("completed")}>
              {busy === "completed" ? "Guardando…" : "Marcar atendido"}
            </Button>
            <Button variant="outline" className="w-full" disabled={busy !== null || booking.status !== "confirmed"} onClick={() => void act("no_show")}>
              {busy === "no_show" ? "Guardando…" : "No vino"}
            </Button>
            {confirmCancel ? (
              <Button variant="destructive" className="w-full" disabled={busy !== null} onClick={() => void act("cancelled_by_business")}>
                {busy === "cancelled_by_business" ? "Cancelando…" : "Sí, cancelar y liberar el horario"}
              </Button>
            ) : (
              <Button variant="destructive" className="w-full" disabled={busy !== null} onClick={() => setConfirmCancel(true)}>
                Cancelar turno
              </Button>
            )}
            {!started && booking.status === "confirmed" && (
              <p className="text-center text-[13px] text-muted-ink">Todavía no empezó: márcalo atendido o ausente después de la hora.</p>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <Ticket className="px-5 pt-[18px] pb-[22px]">
          <span className="font-sans text-sm text-muted-ink">{capitalize(shortDate(booking.startsAt, tz))}</span>
          <b className="mt-1 block font-led text-[44px] leading-none">{timeOf(booking.startsAt, tz)}</b>
          <b>{booking.customer.name}</b> · {booking.service.name} · {booking.service.durationMinutes} min
          <br />
          Barbero: {booking.staff.displayName}
          <br />
          Precio: {formatMoney(booking.priceCents)}
          {booking.depositCents > 0 && (
            <>
              <br />
              Seña: {formatMoney(booking.depositCents)}{" "}
              {booking.payment?.status === "approved"
                ? "· pagada por Mercado Pago"
                : booking.status === "pending_payment"
                  ? "· esperando el pago"
                  : "· sin pagar"}
            </>
          )}
          <TicketRule />
          <span className="text-xs text-muted-ink">
            N.º {booking.number} · {booking.source === "manual" ? "reserva manual" : "reserva online"}
          </span>
          <Stamp kind={booking.status} className="absolute top-5 right-4" />
        </Ticket>
        <div>
          <p className="eyebrow text-xs text-muted-ink">Cliente</p>
          <p className="mt-1">
            <b>{booking.customer.name}</b>
            {booking.customer.phone && (
              <>
                <br />
                <a href={`tel:${booking.customer.phone.replace(/\s/g, "")}`} className="font-ticket underline underline-offset-4">
                  {booking.customer.phone}
                </a>
              </>
            )}
          </p>
        </div>
        {booking.notes && (
          <div>
            <p className="eyebrow text-xs text-muted-ink">Nota</p>
            <p className="mt-1 text-[15px]">{booking.notes}</p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-signal-ink">
            — {error}
          </p>
        )}
      </div>
    </SidePanel>
  );
}
