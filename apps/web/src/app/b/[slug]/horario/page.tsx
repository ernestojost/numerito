import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Availability } from "@numerito/shared";
import { Stepper } from "@/components/booking/stepper";
import { buttonVariants } from "@/components/ui/button";
import { nextDays } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { getPublicBusiness } from "../data";
import { SlotPicker } from "./slot-picker";

export const metadata: Metadata = { title: "Elige horario · Numerito" };

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const DAYS_SHOWN = 14;

export default async function ChooseTimePage({ params, searchParams }: PageProps<"/b/[slug]/horario">) {
  const { slug } = await params;
  const query = await searchParams;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();

  const service = business.services.find((s) => s.id === query.servicio);
  if (!service) redirect(`/b/${slug}`);
  const staffId = typeof query.barbero === "string" && query.barbero !== "cualquiera" ? query.barbero : undefined;
  const barber = staffId ? business.staff.find((s) => s.id === staffId) : undefined;
  if (staffId && !barber) redirect(`/b/${slug}/barbero?servicio=${service.id}`);

  const openWeekdays = new Set(business.hours.map((h) => h.weekday));
  const days = nextDays(business.timezone, DAYS_SHOWN);
  const firstOpen = days.find((d) => openWeekdays.has(d.weekday))?.date ?? days[0]!.date;
  const date = typeof query.fecha === "string" && days.some((d) => d.date === query.fecha) ? query.fecha : firstOpen;

  const url = new URL(`${API_URL}/api/v1/public/businesses/${slug}/availability`);
  url.searchParams.set("serviceId", service.id);
  url.searchParams.set("date", date);
  if (staffId) url.searchParams.set("staffId", staffId);
  const res = await fetch(url, { cache: "no-store" });
  const availability = res.ok ? ((await res.json()) as Availability) : { date, timezone: business.timezone, slots: [] };

  const base = `/b/${slug}/horario?servicio=${service.id}&barbero=${staffId ?? "cualquiera"}`;
  const selectedDay = days.find((d) => d.date === date)!;

  return (
    <main className="flex flex-1 flex-col px-5 pb-40">
      <Link
        href={`/b/${slug}/barbero?servicio=${service.id}&barbero=${staffId ?? "cualquiera"}`}
        className={buttonVariants({ variant: "ghost", className: "-ml-1 self-start" })}
      >
        ← {barber?.displayName ?? "Cualquier barbero"}
      </Link>
      <div className="mt-2 flex flex-col gap-3.5">
        <Stepper current={3} />
        <p className="eyebrow">
          {selectedDay.month} {selectedDay.year}
        </p>
        <nav aria-label="Días" className="-mr-5 flex gap-2 overflow-x-auto pr-5 pb-1">
          {days.map((d) => {
            const closed = !openWeekdays.has(d.weekday);
            const selected = d.date === date;
            return closed ? (
              <span
                key={d.date}
                aria-disabled="true"
                className="flex h-16 w-[60px] shrink-0 flex-col items-center justify-center rounded-[2px] border-[1.5px] border-machine text-muted-ink line-through"
                title="Cerrado"
              >
                <small className="text-[11px] font-bold tracking-[.08em]">{d.label}</small>
                <b className="font-led text-[22px] leading-none">{d.day}</b>
              </span>
            ) : (
              <Link
                key={d.date}
                href={`${base}&fecha=${d.date}`}
                replace
                scroll={false}
                aria-current={selected ? "date" : undefined}
                className={cn(
                  "flex h-16 w-[60px] shrink-0 flex-col items-center justify-center rounded-[2px] border-[1.5px] border-ink",
                  selected && "bg-ink text-paper",
                )}
              >
                <small className="text-[11px] font-bold tracking-[.08em]">{d.label}</small>
                <b className="font-led text-[22px] leading-none">{d.day}</b>
              </Link>
            );
          })}
        </nav>

        <SlotPicker
          key={date}
          businessSlug={slug}
          timezone={business.timezone}
          service={{ id: service.id, name: service.name, durationMinutes: service.durationMinutes, depositCents: service.depositCents }}
          staffId={staffId ?? null}
          barberName={barber?.displayName ?? "cualquier barbero"}
          slots={availability.slots}
          preselected={typeof query.hora === "string" ? query.hora : undefined}
        />
      </div>
    </main>
  );
}
