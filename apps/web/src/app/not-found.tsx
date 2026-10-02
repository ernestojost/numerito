import Link from "next/link";
import { Dispenser } from "@/components/brand/dispenser";
import { LedChip } from "@/components/brand/led";
import { Stamp } from "@/components/brand/stamp";
import { Ticket, TicketRule } from "@/components/brand/ticket";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-16">
      <Dispenser className="h-[110px] w-full max-w-[360px]">
        <span className="font-display text-lg tracking-[.08em]">TOME SU NÚMERO</span>
        <LedChip className="text-lg">404 · SIN TICKET</LedChip>
      </Dispenser>
      <Ticket className="-mt-1 w-[300px] px-6 pt-7 pb-8 text-center">
        <b>ESTA PÁGINA NO EXISTE</b>
        <br />
        <span className="text-muted-ink">el link puede estar mal escrito</span>
        <TicketRule />
        <span className="text-muted-ink">— numerito —</span>
        <Stamp kind="slot_taken" className="mx-auto mt-4 block w-fit text-[28px]">
          404
        </Stamp>
      </Ticket>
      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        <Link href="/" className={buttonVariants({ className: "min-h-12" })}>
          Ir al inicio
        </Link>
        <Link href="/b/don-julio" className={buttonVariants({ variant: "ghost" })}>
          — Ver la barbería demo
        </Link>
      </div>
    </main>
  );
}
