import type { Metadata } from "next";
import { headers } from "next/headers";
import { Dispenser } from "@/components/brand/dispenser";
import { Led } from "@/components/brand/led";
import { Ticket } from "@/components/brand/ticket";
import { getMyBusinesses } from "@/lib/server-api";
import { CopyLinkButton } from "./copy-link-button";

export const metadata: Metadata = { title: "Agenda · Numerito" };

export default async function AgendaPage({ params }: PageProps<"/panel/[businessId]">) {
  const { businessId } = await params;
  const business = (await getMyBusinesses()).find((b) => b.id === businessId);
  if (!business) return null;

  const today = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: business.timezone,
  }).format(new Date());

  return (
    <main className="px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-[32px] leading-none uppercase">Agenda</h1>
        <span className="font-bold first-letter:uppercase">{today}</span>
      </div>

      <div className="mt-6 flex max-w-md flex-col gap-4">
        <Led off>SIN TURNOS HOY</Led>
        <div className="mt-10 flex flex-col items-center">
          <Dispenser className="h-[72px] w-[240px]" />
          <Ticket tear="bottom" className="-mt-1 w-[220px] px-[18px] pt-[22px] pb-[26px] text-center">
            <b className="block font-display text-xl uppercase">Sin turnos hoy</b>
            <span className="text-[13px] text-muted-ink">
              Pronto vas a poder cargar servicios, barberos y horarios para abrir tu agenda.
            </span>
          </Ticket>
        </div>
        <CopyLinkButton url={`${await publicOrigin()}/b/${business.slug}`} />
      </div>
    </main>
  );
}

async function publicOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
