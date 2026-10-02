import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Ticket, TicketRule } from "@/components/brand/ticket";
import { formatMoney } from "@/lib/money";
import { SimulatedCheckout } from "./simulated-checkout";

export const metadata: Metadata = { title: "Pago simulado · Numerito", robots: { index: false } };

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Stand-in for the Mercado Pago checkout while no credentials are configured (development and demo).
 * It says so on the page: nothing here looks like, or is, a real payment form.
 */
export default async function SimulatedCheckoutPage({ searchParams }: PageProps<"/pago-simulado">) {
  const query = await searchParams;
  const bookingId = typeof query.turno === "string" ? query.turno : "";
  const amount = typeof query.monto === "string" ? Number(query.monto) : NaN;
  if (!UUID.test(bookingId) || !Number.isInteger(amount) || amount <= 0) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-5 px-5 py-8">
      <Logo className="text-lg" />
      <div className="rounded-[2px] border-[1.5px] border-dashed border-ink px-4 py-3 text-sm">
        <b>Modo demo · pago simulado.</b> Esta barbería todavía no conectó Mercado Pago, así que no se cobra nada. Elige el
        resultado para ver cómo sigue la reserva.
      </div>
      <Ticket className="px-5 pt-5 pb-6">
        <b>SEÑA DEL TURNO</b>
        <b className="my-2 block font-led text-[42px] leading-none">{formatMoney(amount)}</b>
        <TicketRule />
        <span className="text-xs text-muted-ink">Turno {bookingId.slice(0, 8)}…</span>
      </Ticket>
      <SimulatedCheckout bookingId={bookingId} amountCents={amount} />
    </main>
  );
}
