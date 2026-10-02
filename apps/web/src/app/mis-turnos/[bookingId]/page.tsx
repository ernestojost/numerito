import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Booking } from "@numerito/shared";
import { BookingTicket } from "@/components/booking/booking-ticket";
import { Dispenser } from "@/components/brand/dispenser";
import { Led } from "@/components/brand/led";
import { buttonVariants } from "@/components/ui/button";
import { timeOf } from "@/lib/datetime";
import { serverJson } from "@/lib/server-api";

export const metadata: Metadata = { title: "Tu turno · Numerito" };

export default async function BookingPage({ params, searchParams }: PageProps<"/mis-turnos/[bookingId]">) {
  const { bookingId } = await params;
  const isNew = (await searchParams).nuevo === "1";
  const booking = await serverJson<Booking>(`/me/bookings/${bookingId}`);
  if (!booking) notFound();

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
          Turno confirmado. Te lo recordamos 24 h antes.
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
