import type { Metadata } from "next";
import Link from "next/link";
import type { Booking } from "@numerito/shared";
import { Dispenser } from "@/components/brand/dispenser";
import { Ticket } from "@/components/brand/ticket";
import { buttonVariants } from "@/components/ui/button";
import { requestTime } from "@/lib/request-time";
import { getSession, serverJson } from "@/lib/server-api";
import { cn } from "@/lib/utils";
import { BookingCard } from "./booking-card";

export const metadata: Metadata = { title: "Mis turnos · Numerito" };

export default async function MyBookingsPage({ searchParams }: PageProps<"/mis-turnos">) {
  const past = (await searchParams).ver === "anteriores";
  const [session, bookings] = await Promise.all([getSession(), serverJson<Booking[]>("/me/bookings")]);
  const now = requestTime();
  const upcoming = (bookings ?? [])
    .filter((b) => new Date(b.endsAt).getTime() >= now && (b.status === "confirmed" || b.status === "pending_payment"))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const previous = (bookings ?? []).filter((b) => !upcoming.includes(b));
  const list = past ? previous : upcoming;

  return (
    <main className="flex flex-col gap-4 px-5 pt-1 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] leading-none uppercase">Mis turnos</h1>
        {session && (
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper" title={session.user.name}>
            {session.user.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <nav aria-label="Turnos" className="flex gap-7 border-b border-machine">
        <Tab href="/mis-turnos" active={!past}>
          Próximos ({upcoming.length})
        </Tab>
        <Tab href="/mis-turnos?ver=anteriores" active={past}>
          Anteriores
        </Tab>
      </nav>

      {list.length === 0 ? (
        <div className="mt-8 flex flex-col items-center">
          <Dispenser className="h-[72px] w-[240px]" />
          <Ticket tear="bottom" className="-mt-1 w-[220px] px-[18px] pt-[22px] pb-[26px] text-center">
            <b className="block font-display text-xl uppercase">{past ? "Sin turnos anteriores" : "Todavía no tienes turnos"}</b>
            <span className="text-[13px] text-muted-ink">Saca uno desde el link de tu barbería.</span>
          </Ticket>
          <Link href="/b/don-julio" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
            Ver la barbería demo
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((b) => (
            <li key={b.id}>
              <BookingCard booking={b} canCancel={new Date(b.cancellableUntil).getTime() > now} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px flex min-h-11 items-center border-b-[3px] text-sm font-bold tracking-[.08em] uppercase",
        active ? "border-signal text-ink" : "border-transparent text-muted-ink",
      )}
    >
      {children}
    </Link>
  );
}
