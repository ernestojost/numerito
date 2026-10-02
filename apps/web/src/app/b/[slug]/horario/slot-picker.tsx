"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Booking, Slot } from "@numerito/shared";
import { Stamp } from "@/components/brand/stamp";
import { Ticket } from "@/components/brand/ticket";
import { Button } from "@/components/ui/button";
import { ApiRequestError, api } from "@/lib/api";
import { shortDate, timeOf } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const NOON = 13;

export function SlotPicker({
  businessSlug,
  timezone,
  service,
  staffId,
  barberName,
  slots,
  preselected,
}: {
  businessSlug: string;
  timezone: string;
  service: { id: string; name: string; durationMinutes: number; depositCents: number };
  staffId: string | null;
  barberName: string;
  slots: Slot[];
  preselected?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string | null>(slots.some((s) => s.startsAt === preselected) ? preselected! : null);
  const [taken, setTaken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = slots.filter((s) => s.startsAt !== taken);
  const groups = [
    { label: "Mañana", slots: visible.filter((s) => Number(timeOf(s.startsAt, timezone).slice(0, 2)) < NOON) },
    { label: "Tarde", slots: visible.filter((s) => Number(timeOf(s.startsAt, timezone).slice(0, 2)) >= NOON) },
  ].filter((g) => g.slots.length > 0);

  async function confirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api<Booking>("/bookings", {
        method: "POST",
        body: { businessSlug, serviceId: service.id, staffId, startsAt: selected },
      });
      router.push(`/mis-turnos/${booking.id}?nuevo=1`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        // Keep the chosen time in the URL so the client comes back to it after signing in.
        const params = new URLSearchParams(searchParams.toString());
        params.set("hora", selected);
        router.push(`/entrar?next=${encodeURIComponent(`${pathname}?${params}`)}`);
        return;
      }
      if (err instanceof ApiRequestError && err.status === 409) {
        setTaken(selected);
        setSelected(null);
        router.refresh();
      } else {
        setError(err instanceof ApiRequestError ? err.message : "No pudimos reservar. Prueba de nuevo.");
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      {taken && (
        <div role="alert" className="flex items-center gap-4 py-2">
          <Ticket className="w-[150px] shrink-0 rotate-6 px-3.5 py-3 text-[13px]">
            TURNO {timeOf(taken, timezone)}
            <br />
            <b>YA TOMADO</b>
            <Stamp kind="slot_taken" className="mt-1.5 block w-fit text-lg">
              409
            </Stamp>
          </Ticket>
          <p className="text-[15px] text-ink-2">
            <b className="block font-display text-xl text-ink uppercase">Alguien lo tomó un segundo antes</b>
            El turno tiene un solo dueño. Elige otro horario; ya están actualizados.
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="py-6 text-muted-ink">No quedan horarios libres este día. Prueba con otro.</p>
      ) : (
        groups.map((group) => (
          <section key={group.label} aria-label={group.label} className="flex flex-col gap-2.5">
            <h3 className="eyebrow text-xs">{group.label}</h3>
            <div className="grid grid-cols-3 gap-3">
              {group.slots.map((slot) => {
                const isSelected = slot.startsAt === selected;
                return (
                  <button
                    key={slot.startsAt}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelected(slot.startsAt)}
                    className={cn(
                      "flex min-h-12 flex-col items-center justify-center rounded-[2px] border-[1.5px] border-ink bg-ticket py-1.5 font-ticket text-lg leading-tight font-bold",
                      isSelected && "tear-b bg-ink text-paper",
                    )}
                  >
                    {timeOf(slot.startsAt, timezone)}
                    {!staffId && (
                      <small className={cn("font-sans text-[11px] font-medium", isSelected ? "text-machine" : "text-muted-ink")}>
                        {slot.staffIds.length === 1 ? "1 libre" : `${slot.staffIds.length} libres`}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}

      <div className="ticket tear-t fixed inset-x-0 bottom-0 z-10 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] font-sans shadow-[0_-8px_24px_rgba(0,0,0,.08)]">
        <div className="mx-auto flex max-w-[440px] flex-col gap-3">
          <p className="font-ticket text-sm">
            {selected ? (
              <>
                {shortDate(selected, timezone)} · <b>{timeOf(selected, timezone)}</b> · {service.name} · {barberName}
              </>
            ) : (
              <span className="text-muted-ink">Elige un horario</span>
            )}
          </p>
          {error && (
            <p role="alert" className="text-sm text-signal-ink">
              — {error}
            </p>
          )}
          <Button className="min-h-12 w-full" disabled={!selected || submitting} onClick={() => void confirm()}>
            {submitting ? "Reservando…" : "Confirmar turno"}
          </Button>
          {service.depositCents > 0 && (
            <p className="text-center text-[13px] text-muted-ink">
              Seña de {formatMoney(service.depositCents)}: por ahora se paga en el local.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
