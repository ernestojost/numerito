"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Booking } from "@numerito/shared";
import { Stamp } from "@/components/brand/stamp";
import { Ticket, TicketRule } from "@/components/brand/ticket";
import { Button, buttonVariants } from "@/components/ui/button";
import { ApiRequestError, api } from "@/lib/api";
import { capitalize, longDate, timeOf } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";

/** Back from the checkout: confirm the payment with the API, then show the clean ticket URL. */
export function PaymentReturn({ bookingId, paymentId }: { bookingId: string; paymentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    api<Booking>(`/me/bookings/${bookingId}/payment-return`, { method: "POST", body: { paymentId } })
      .then((b) => router.replace(`/mis-turnos/${bookingId}${b.status === "confirmed" ? "?nuevo=1" : ""}`))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "No pudimos verificar el pago."));
  }, [bookingId, paymentId, router]);

  return (
    <div role="status" className="flex flex-col items-center gap-4 py-16 text-center">
      {error ? (
        <>
          <p className="text-signal-ink">— {error}</p>
          <Link href={`/mis-turnos/${bookingId}`} className={buttonVariants({ variant: "outline" })}>
            Ver el turno
          </Link>
        </>
      ) : (
        <>
          <span className="led-glow rounded-lg bg-led px-4 py-3 font-led text-2xl font-bold">VERIFICANDO PAGO</span>
          <p className="text-sm text-muted-ink">Un momento, estamos confirmando la seña con Mercado Pago.</p>
        </>
      )}
    </div>
  );
}

function useCountdown(until: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(until).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  return left;
}

const mmss = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** The slot is held while the client pays the deposit. */
export function HoldView({ booking }: { booking: Booking }) {
  const router = useRouter();
  const left = useCountdown(booking.expiresAt!);
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tz = booking.business.timezone;
  const rejected = booking.payment?.status === "rejected";
  const expired = left === 0;

  useEffect(() => {
    if (expired) router.refresh();
  }, [expired, router]);

  async function pay() {
    setBusy("pay");
    setError(null);
    try {
      const { checkoutUrl } = await api<{ checkoutUrl: string }>(`/me/bookings/${booking.id}/checkout`, { method: "POST" });
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "No pudimos abrir el pago. Prueba de nuevo.");
      setBusy(null);
      router.refresh();
    }
  }

  async function release() {
    setBusy("cancel");
    await api(`/me/bookings/${booking.id}/cancel`, { method: "POST" }).catch(() => undefined);
    router.push(`/b/${booking.business.slug}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-lg bg-led px-[18px] py-3 shadow-[inset_0_0_0_3px_var(--color-led-frame)]">
        <span className="text-[11px] leading-[1.3] font-bold tracking-[.16em] text-led-off uppercase">
          Turno
          <br />
          retenido
        </span>
        <span className="led-glow font-led text-[32px] leading-none font-bold" aria-live="off">
          {left === null ? "--:--" : mmss(left)}
        </span>
      </div>
      {rejected && (
        <div role="alert">
          <h2 className="font-display text-[28px] leading-[1.1] uppercase">No pudimos cobrar la seña</h2>
          <p className="mt-1 text-[15px] text-ink-2">El pago fue rechazado. Tu turno sigue retenido mientras el contador no llegue a cero.</p>
        </div>
      )}
      <Ticket className="px-5 pt-5 pb-6">
        <b className="uppercase">{booking.business.name}</b>
        <b className="mt-2.5 mb-1.5 block font-led text-[44px] leading-none">{timeOf(booking.startsAt, tz)}</b>
        {capitalize(longDate(booking.startsAt, tz))}
        <br />
        {booking.service.name} · {booking.service.durationMinutes} min
        <br />
        Barbero: {booking.staff.displayName}
        <Stamp kind={rejected ? "payment_rejected" : "pending_payment"} className="absolute top-9 right-3.5 text-lg" />
        <TicketRule />
        <div className="flex justify-between">
          <span>{booking.service.name}</span>
          <span>{formatMoney(booking.priceCents)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Seña ahora</span>
          <span>{formatMoney(booking.depositCents)}</span>
        </div>
        <div className="flex justify-between">
          <span>Resto en el local</span>
          <span>{formatMoney(booking.priceCents - booking.depositCents)}</span>
        </div>
      </Ticket>
      {error && (
        <p role="alert" className="text-sm text-signal-ink">
          — {error}
        </p>
      )}
      <Button variant="mp" size="lg" className="w-full text-base" disabled={busy !== null || expired} onClick={() => void pay()}>
        <span className="inline-flex size-[26px] items-center justify-center rounded-[2px] bg-white text-[11px]">MP</span>
        {busy === "pay" ? "Abriendo…" : rejected ? "Reintentar con Mercado Pago" : "Pagar seña con Mercado Pago"}
      </Button>
      <p className="text-center text-[13px] text-muted-ink">Si no pagas en 10 minutos el turno se libera y no se cobra nada.</p>
      <Button variant="ghost" className="self-center" disabled={busy !== null} onClick={() => void release()}>
        — Cancelar retención
      </Button>
    </div>
  );
}

/** Nobody paid in time: the slot went back to the agenda. */
export function ExpiredView({ booking }: { booking: Booking }) {
  const tz = booking.business.timezone;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg bg-led px-[18px] py-3 shadow-[inset_0_0_0_3px_var(--color-led-frame)]">
        <span className="text-[11px] font-bold tracking-[.16em] text-led-off uppercase">Retención</span>
        <span className="font-led text-[28px] leading-none font-bold text-led-off">VENCIDO · 00:00</span>
      </div>
      <Ticket className="mx-4 mt-1 rotate-[4deg] px-5 pt-5 pb-6 opacity-60 shadow-[0_4px_10px_rgba(0,0,0,.1)]">
        <b className="uppercase">{booking.business.name}</b>
        <b className="mt-2 mb-1 block font-led text-[40px] leading-none">{timeOf(booking.startsAt, tz)}</b>
        {booking.service.name}
        <br />
        retención vencida
        <Stamp kind="expired" className="absolute top-7 right-3.5" />
      </Ticket>
      <h2 className="mt-2 font-display text-[28px] leading-[1.1] uppercase">Se liberó el turno</h2>
      <p className="text-[15px] text-ink-2">
        Pasaron los 10 minutos y el horario volvió a estar disponible para cualquiera. No se cobró nada.
      </p>
      <Link href={`/b/${booking.business.slug}`} className={buttonVariants({ className: "min-h-12 w-full" })}>
        Buscar horario de nuevo
      </Link>
    </div>
  );
}
