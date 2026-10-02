import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Booking } from "@numerito/shared";
import { BookingTicket } from "@/components/booking/booking-ticket";
import { Dispenser } from "@/components/brand/dispenser";
import { Led } from "@/components/brand/led";
import { buttonVariants } from "@/components/ui/button";
import { timeOf } from "@/lib/datetime";
import { requestTime } from "@/lib/request-time";
import { serverJson } from "@/lib/server-api";
import { ExpiredView, HoldView, PaymentReturn } from "./payment-states";

export const metadata: Metadata = { title: "Tu turno · Numerito" };

export default async function BookingPage({ params, searchParams }: PageProps<"/mis-turnos/[bookingId]">) {
  const { bookingId } = await params;
  const query = await searchParams;

  // Mercado Pago sends payment_id (and collection_id) back on the return URL; so does the simulated checkout.
  const paymentId = [query.payment_id, query.collection_id].find((v): v is string => typeof v === "string" && v !== "null");
  if (paymentId) {
    return (
      <main className="px-5">
        <PaymentReturn bookingId={bookingId} paymentId={paymentId} />
      </main>
    );
  }

  const booking = await serverJson<Booking>(`/me/bookings/${bookingId}`);
  if (!booking) notFound();

  // A hold past its deadline is already free for others, even if the sweeper hasn't marked it yet.
  const holdOpen = booking.status === "pending_payment" && !!booking.expiresAt && new Date(booking.expiresAt).getTime() > requestTime();
  if (holdOpen) {
    return (
      <main className="px-5 pt-2 pb-10">
        <p className="eyebrow mb-3">Pago de seña</p>
        <HoldView booking={booking} />
      </main>
    );
  }
  if (booking.status === "expired" || booking.status === "pending_payment") {
    return (
      <main className="px-5 pt-2 pb-10">
        <ExpiredView booking={booking} />
      </main>
    );
  }

  const isNew = query.nuevo === "1";
  const time = timeOf(booking.startsAt, booking.business.timezone);
  return (
    <main className="flex flex-col items-center px-5 pt-2 pb-10">
      <Led className="w-full justify-center" valueClassName="text-[28px]">
        {booking.status === "confirmed" ? `LISTO · ${time}` : `TURNO · ${time}`}
      </Led>
      <Dispenser className="mt-3.5 h-14 w-full rounded-[12px_12px_6px_6px]" />
      <div className="-mt-1 flex w-full justify-center">
        <BookingTicket booking={booking} printing={isNew} />
      </div>
      {isNew && (
        <p role="status" className="ticket mt-5 w-full px-4 py-3.5 text-sm shadow-[inset_4px_0_0_var(--color-ok),0_8px_20px_rgba(0,0,0,.12)]">
          {booking.payment?.status === "approved" ? "Seña acreditada. Turno confirmado." : "Turno confirmado."} Te lo recordamos 24 h antes.
        </p>
      )}
      <div className="mt-5 flex w-full flex-col items-center gap-2.5">
        <Link href="/mis-turnos" className={buttonVariants({ className: "min-h-12 w-full" })}>
          Ver mis turnos
        </Link>
        <Link href={`/b/${booking.business.slug}`} className={buttonVariants({ variant: "ghost" })}>
          — Volver a {booking.business.name}
        </Link>
      </div>
    </main>
  );
}
