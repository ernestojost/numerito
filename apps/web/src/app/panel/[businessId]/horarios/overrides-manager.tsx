"use client";

import { TZDate } from "@date-fns/tz";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Override, OverrideInput, Staff } from "@numerito/shared";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { SidePanel } from "@/components/ui/side-panel";
import { Switch } from "@/components/ui/switch";
import { ApiRequestError, api } from "@/lib/api";

/** "2026-10-12" + "14:00" in the business time zone → ISO string with that zone's offset. */
function toZonedIso(date: string, time: string, timezone: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new TZDate(y!, m! - 1, d!, hh!, mm!, timezone).toISOString();
}

function nextDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + 1));
  return next.toISOString().slice(0, 10);
}

export function OverridesManager({
  businessId,
  timezone,
  staff,
  overrides,
}: {
  businessId: string;
  timezone: string;
  staff: Staff[];
  overrides: Override[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const staffName = new Map(staff.map((s) => [s.id, s.displayName]));

  const fmtDay = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short", timeZone: timezone });
  const fmtTime = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone });

  function describe(o: Override) {
    const start = new Date(o.startsAt);
    const end = new Date(o.endsAt);
    const allDay = fmtTime.format(start) === "00:00" && fmtTime.format(end) === "00:00";
    return allDay ? `${fmtDay.format(start)} · todo el día` : `${fmtDay.format(start)} · ${fmtTime.format(start)}–${fmtTime.format(end)}`;
  }

  async function remove(id: string) {
    await api(`/businesses/${businessId}/overrides/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-ink">Feriados, vacaciones, turnos médicos o días que abres de más.</p>
        <Button variant="outline" onClick={() => setCreating(true)}>
          + Nuevo bloqueo o apertura
        </Button>
      </div>

      {overrides.length === 0 ? (
        <p className="py-6 text-muted-ink">No hay bloqueos próximos.</p>
      ) : (
        <ul className="flex flex-col">
          {overrides.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-machine py-3 text-[15px]">
              <span className="w-[230px] font-ticket font-bold first-letter:uppercase">{describe(o)}</span>
              <span className="min-w-0 flex-1">
                {o.staffId ? staffName.get(o.staffId) ?? "Barbero" : "Toda la barbería"}
                {o.reason ? ` · ${o.reason}` : ""}
              </span>
              <span
                className={
                  o.kind === "blocked"
                    ? "rounded-[2px] bg-signal-soft px-2 py-0.5 text-xs font-bold tracking-wider text-signal-ink uppercase"
                    : "rounded-[2px] bg-ok-soft px-2 py-0.5 text-xs font-bold tracking-wider text-ok uppercase"
                }
              >
                {o.kind === "blocked" ? "Bloqueo" : "Apertura"}
              </span>
              <Button variant="ghost" size="sm" onClick={() => void remove(o.id)} aria-label={`Quitar ${describe(o)}`}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <OverrideForm
          businessId={businessId}
          timezone={timezone}
          staff={staff}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function OverrideForm({
  businessId,
  timezone,
  staff,
  onClose,
  onSaved,
}: {
  businessId: string;
  timezone: string;
  staff: Staff[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  const [who, setWho] = useState("");
  const [date, setDate] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [from, setFrom] = useState("14:00");
  const [to, setTo] = useState("15:00");
  const [kind, setKind] = useState<"blocked" | "extra_open">("blocked");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return setError("Elige la fecha");
    if (!allDay && from >= to) return setError("La hora de fin tiene que ser después del inicio");

    const body: OverrideInput = {
      staffId: who || null,
      kind,
      reason: reason.trim() || null,
      startsAt: toZonedIso(date, allDay ? "00:00" : from, timezone),
      endsAt: allDay ? toZonedIso(nextDay(date), "00:00", timezone) : toZonedIso(date, to, timezone),
    };
    setSaving(true);
    try {
      await api(`/businesses/${businessId}/overrides`, { method: "POST", body });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "No se pudo guardar. Prueba de nuevo.");
      setSaving(false);
    }
  }

  return (
    <SidePanel
      title="Bloqueo o apertura"
      onClose={onClose}
      footer={
        <Button type="submit" form="override-form" disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      }
    >
      <form id="override-form" onSubmit={save} noValidate className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-1">
          <legend className="eyebrow mb-1.5">Tipo</legend>
          <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
            <input type="radio" name="kind" className="size-5 accent-ink" checked={kind === "blocked"} onChange={() => setKind("blocked")} />
            Bloqueo (no se puede reservar)
          </label>
          <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
            <input type="radio" name="kind" className="size-5 accent-ink" checked={kind === "extra_open"} onChange={() => setKind("extra_open")} />
            Apertura extra (abres fuera de horario)
          </label>
        </fieldset>
        <Field id="ov-who" label="Para quién">
          <select id="ov-who" className={inputClass} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Toda la barbería</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field id="ov-date" label="Fecha">
          <input id="ov-date" type="date" className={inputClass} value={date} min={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="flex min-h-11 items-center gap-3 text-[15px]">
          <Switch checked={allDay} onChange={setAllDay} label="Todo el día" />
          Todo el día
        </div>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3.5">
            <Field id="ov-from" label="Desde">
              <input id="ov-from" type="time" className={`${inputClass} font-ticket font-bold`} value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field id="ov-to" label="Hasta">
              <input id="ov-to" type="time" className={`${inputClass} font-ticket font-bold`} value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}
        <Field id="ov-reason" label="Motivo (opcional)">
          <input id="ov-reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Feriado, vacaciones, turno médico…" maxLength={80} />
        </Field>
        <p className="text-[13px] text-muted-ink">Hora de la barbería ({timezone}).</p>
        {error && (
          <p role="alert" className="text-sm text-signal-ink">
            — {error}
          </p>
        )}
      </form>
    </SidePanel>
  );
}
