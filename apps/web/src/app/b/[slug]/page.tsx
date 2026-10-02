import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { openStatus } from "@numerito/shared";
import { Stepper } from "@/components/booking/stepper";
import { Dispenser } from "@/components/brand/dispenser";
import { Led } from "@/components/brand/led";
import { Ticket } from "@/components/brand/ticket";
import { statusLabel, summarizeHours } from "@/lib/hours";
import { formatMoney } from "@/lib/money";
import { getPublicBusiness } from "./data";

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const business = await getPublicBusiness((await params).slug);
  return business
    ? { title: `${business.name} · Reserva tu turno`, description: `Reserva online en ${business.name}. Sin fila, sin llamadas.` }
    : { title: "Barbería no encontrada · Numerito" };
}

export default async function BusinessPage({ params }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();

  const status = openStatus(business.hours, new Date(), business.timezone);
  const bookable = business.services.filter((s) => s.staffIds.length > 0);

  return (
    <main className="flex flex-col gap-4 px-5 pt-1 pb-10">
      <Led off={!status.open} valueClassName="text-[22px] min-[400px]:text-2xl">
        {statusLabel(status)}
      </Led>
      <div>
        <h1 className="font-display text-[40px] leading-[1.05] uppercase">{business.name}</h1>
        {business.hours.length > 0 && <p className="mt-1 text-sm text-muted-ink">{summarizeHours(business.hours)}</p>}
        {business.slug === "don-julio" && (
          <span className="mt-2 inline-flex rounded-[2px] border-[1.5px] border-ink-2 px-2 py-0.5 text-xs font-bold tracking-wider text-ink-2 uppercase">
            Negocio demo
          </span>
        )}
      </div>

      <Stepper current={1} />

      {bookable.length === 0 ? (
        <Ticket tear="bottom" className="px-5 pt-5 pb-6">
          <b className="block font-display text-xl uppercase">Todavía sin turnos online</b>
          <span className="text-[13px] text-muted-ink">Esta barbería está terminando de cargar sus servicios. Vuelve pronto.</span>
        </Ticket>
      ) : (
        <div className="flex flex-col">
          <Dispenser className="h-[52px] rounded-[12px_12px_6px_6px]">
            <span className="font-display text-[15px] tracking-[.08em]">TOME SU NÚMERO</span>
          </Dispenser>
          <ul className="-mt-1.5 flex flex-col gap-3">
            {bookable.map((service) => (
              <li key={service.id}>
                <Link
                  href={`/b/${business.slug}/barbero?servicio=${service.id}`}
                  className="ticket tear flex min-h-[84px] items-center justify-between gap-4 px-[18px] outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <span>
                    <b className="text-base">{service.name}</b>
                    <br />
                    <span className="text-muted-ink">{service.durationMinutes} min</span>
                  </span>
                  <span className="text-right">
                    <b className="text-lg">{formatMoney(service.priceCents)}</b>
                    <br />
                    {service.depositCents > 0 && <span className="text-xs text-muted-ink">seña {formatMoney(service.depositCents)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-1 text-center text-[13px] text-muted-ink">Sin fila, sin llamadas. Pagas la seña y el horario es tuyo.</p>
    </main>
  );
}
