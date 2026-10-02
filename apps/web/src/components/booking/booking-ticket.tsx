import type { Booking } from "@numerito/shared";
import { Stamp } from "@/components/brand/stamp";
import { Barcode, Ticket, TicketRule } from "@/components/brand/ticket";
import { capitalize, longDate, shortDate, timeOf } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** The full printed ticket of a booking, as the client sees it. */
export function BookingTicket({ booking, printing }: { booking: Booking; printing?: boolean }) {
  const tz = booking.business.timezone;
  const live = booking.status === "confirmed" || booking.status === "pending_payment";
  return (
    <Ticket className={cn("w-full max-w-[320px] px-[22px] pt-5 pb-[22px] text-sm", printing && "animate-print", !live && "opacity-70")}>
      <b className="block text-center uppercase">{booking.business.name}</b>
      <span className="block text-center text-xs text-muted-ink">— tu ticket —</span>
      <b className="my-2 block text-center font-led text-[56px] leading-none">{timeOf(booking.startsAt, tz)}</b>
      {capitalize(longDate(booking.startsAt, tz))}
      <br />
      {booking.service.name} · {booking.service.durationMinutes} min
      <br />
      Barbero: {booking.staff.displayName}
      <br />
      Precio: {formatMoney(booking.priceCents)}
      {booking.depositCents > 0 && booking.payment?.status === "approved" && (
        <>
          <br />
          Seña: {formatMoney(booking.depositCents)} · pagada ✓
          <br />
          Resto: {formatMoney(booking.priceCents - booking.depositCents)} en el local
        </>
      )}
      <TicketRule />
      {live ? (
        <>
          Recordatorio: 24 h antes
          <br />
          Cancelación: hasta {shortDate(booking.cancellableUntil, tz)} {timeOf(booking.cancellableUntil, tz)}
        </>
      ) : (
        <>Este turno ya no está activo.</>
      )}
      <Barcode value={`NUMERITO${timeOf(booking.startsAt, tz).replace(":", "")}`} className="mt-1.5 text-center text-[38px]" />
      <span className="block text-center text-[11px] text-muted-ink">N.º {booking.number}</span>
      <Stamp kind={booking.status} className={cn("absolute top-[70px] right-3 rotate-[-12deg]", printing && "animate-stamp")} />
    </Ticket>
  );
}
