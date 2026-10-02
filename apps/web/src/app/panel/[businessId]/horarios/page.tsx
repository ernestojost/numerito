import type { Metadata } from "next";
import Link from "next/link";
import type { Override, Staff, TimeRange } from "@numerito/shared";
import { getBusiness, serverJson } from "@/lib/server-api";
import { cn } from "@/lib/utils";
import { BusinessHours, StaffHours } from "./hours-forms";
import { OverridesManager } from "./overrides-manager";

export const metadata: Metadata = { title: "Horarios · Numerito" };

const TABS = [
  { id: "barberia", label: "Barbería" },
  { id: "barbero", label: "Por barbero" },
  { id: "bloqueos", label: "Bloqueos" },
] as const;

export default async function HoursPage({ params, searchParams }: PageProps<"/panel/[businessId]/horarios">) {
  const { businessId } = await params;
  const query = await searchParams;
  const barberoParam = typeof query.barbero === "string" ? query.barbero : undefined;
  const tab = barberoParam ? "barbero" : (TABS.find((t) => t.id === query.tab)?.id ?? "barberia");

  const [business, hours, staff] = await Promise.all([
    getBusiness(businessId),
    serverJson<TimeRange[]>(`/businesses/${businessId}/hours`),
    serverJson<Staff[]>(`/businesses/${businessId}/staff`),
  ]);
  const base = `/panel/${businessId}/horarios`;

  return (
    <main className="px-5 py-6 lg:px-10">
      <h1 className="font-display text-[32px] leading-none uppercase">Horarios</h1>
      <nav aria-label="Secciones de horarios" className="mt-4 flex gap-7 border-b border-machine">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`${base}?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-11 items-center border-b-[3px] text-sm font-bold tracking-[.08em] uppercase",
              tab === t.id ? "border-signal text-ink" : "border-transparent text-muted-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 max-w-[1000px]">
        {tab === "barberia" && (
          <>
            <p className="mb-2 text-sm text-muted-ink">
              Hora de la barbería ({business?.timezone}). Varias franjas en un día = horario partido.
            </p>
            <BusinessHours businessId={businessId} initial={hours ?? []} />
          </>
        )}
        {tab === "barbero" && (
          <StaffTab businessId={businessId} staff={staff ?? []} selectedId={barberoParam ?? staff?.[0]?.id} base={base} businessHours={hours ?? []} />
        )}
        {tab === "bloqueos" && business && (
          <OverridesManager
            businessId={businessId}
            timezone={business.timezone}
            staff={staff ?? []}
            overrides={(await serverJson<Override[]>(`/businesses/${businessId}/overrides`)) ?? []}
          />
        )}
      </div>
    </main>
  );
}

async function StaffTab({
  businessId,
  staff,
  selectedId,
  base,
  businessHours,
}: {
  businessId: string;
  staff: Staff[];
  selectedId?: string;
  base: string;
  businessHours: TimeRange[];
}) {
  if (staff.length === 0) {
    return <p className="mt-4 text-muted-ink">Primero agrega barberos en la sección Barberos.</p>;
  }
  const selected = staff.find((s) => s.id === selectedId) ?? staff[0]!;
  const schedule = (await serverJson<TimeRange[]>(`/businesses/${businessId}/staff/${selected.id}/schedule`)) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {staff.map((s) => (
          <Link
            key={s.id}
            href={`${base}?barbero=${s.id}`}
            aria-current={s.id === selected.id ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-[2px] border-[1.5px] border-ink px-3.5 text-sm font-bold",
              s.id === selected.id && "bg-ink text-paper",
            )}
          >
            {s.displayName}
          </Link>
        ))}
      </div>
      <StaffHours
        key={selected.id}
        businessId={businessId}
        staffId={selected.id}
        name={selected.displayName}
        initial={schedule}
        businessHours={businessHours}
      />
    </div>
  );
}
