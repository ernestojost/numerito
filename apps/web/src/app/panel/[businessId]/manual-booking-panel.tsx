"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ManualBookingInput, Service, Slot } from "@numerito/shared";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { SidePanel } from "@/components/ui/side-panel";
import { ApiRequestError, api } from "@/lib/api";
import { timeOf } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function ManualBookingPanel({
  businessId,
  timezone,
  date: initialDate,
  staff,
  services,
  onClose,
}: {
  businessId: string;
  timezone: string;
  date: string;
  staff: { id: string; name: string }[];
  services: Service[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const service = services.find((s) => s.id === serviceId);
  const staffForService = staff.filter((m) => service?.staffIds.includes(m.id));
  const [staffId, setStaffId] = useState(staffForService[0]?.id ?? "");
  const [date, setDate] = useState(initialDate);
  // Slots are stored with the query they answer, so a stale or pending answer reads as "loading".
  const [result, setResult] = useState<{ key: string; slots: Slot[] } | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validStaff = staffForService.some((m) => m.id === staffId) ? staffId : (staffForService[0]?.id ?? "");
  const queryKey = `${serviceId}|${validStaff}|${date}`;
  const slots = result?.key === queryKey ? result.slots : null;

  useEffect(() => {
    if (!serviceId || !validStaff || !date) return;
    let cancelled = false;
    api<{ slots: Slot[] }>(`/businesses/${businessId}/availability?serviceId=${serviceId}&date=${date}&staffId=${validStaff}`)
      .then((res) => !cancelled && setResult({ key: queryKey, slots: res.slots }))
      .catch(() => !cancelled && setResult({ key: queryKey, slots: [] }));
    return () => {
      cancelled = true;
    };
  }, [businessId, serviceId, validStaff, date, queryKey]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Escribe el nombre del cliente");
    if (!startsAt) return setError("Elige un horario");
    const body: ManualBookingInput = {
      serviceId,
      staffId: validStaff,
      startsAt,
      customer: { name: name.trim(), phone: phone.trim() || null },
      notes: notes.trim() || null,
    };
    setSaving(true);
    setError(null);
    try {
      await api(`/businesses/${businessId}/bookings`, { method: "POST", body });
      router.refresh();
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setError("Ese horario se ocupó recién. Elige otro.");
        setStartsAt(null);
        setResult((r) => (r ? { ...r, slots: r.slots.filter((x) => x.startsAt !== startsAt) } : r));
      } else {
        setError(err instanceof ApiRequestError ? err.message : "No se pudo guardar. Prueba de nuevo.");
      }
      setSaving(false);
    }
  }

  return (
    <SidePanel
      title="Reserva manual"
      onClose={onClose}
      footer={
        <Button type="submit" form="manual-booking" className="w-full" disabled={saving}>
          {saving ? "Guardando…" : "Confirmar turno"}
        </Button>
      }
    >
      <form id="manual-booking" onSubmit={save} noValidate className="flex flex-col gap-4">
        <p className="-mt-1 text-[13px] text-muted-ink">Para el cliente que llama o está en el local. No se cobra seña.</p>
        <Field id="mb-name" label="Cliente">
          <input id="mb-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Leo" autoComplete="off" />
        </Field>
        <Field id="mb-phone" label="Teléfono (opcional)">
          <input id="mb-phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej.: +54 9 11 5555-0000" />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field id="mb-service" label="Servicio">
            <select
              id="mb-service"
              className={inputClass}
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setStartsAt(null);
              }}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatMoney(s.priceCents)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="mb-staff" label="Barbero">
            <select
              id="mb-staff"
              className={inputClass}
              value={validStaff}
              onChange={(e) => {
                setStaffId(e.target.value);
                setStartsAt(null);
              }}
            >
              {staffForService.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="mb-date" label="Fecha">
          <input
            id="mb-date"
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStartsAt(null);
            }}
          />
        </Field>
        <fieldset>
          <legend className="eyebrow mb-2">Hora</legend>
          {staffForService.length === 0 ? (
            <p className="text-sm text-muted-ink">Ningún barbero hace este servicio todavía.</p>
          ) : slots === null ? (
            <p className="text-sm text-muted-ink">Buscando horarios…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-ink">Sin horarios libres ese día.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <button
                  key={s.startsAt}
                  type="button"
                  aria-pressed={s.startsAt === startsAt}
                  onClick={() => setStartsAt(s.startsAt)}
                  className={cn(
                    "min-h-11 rounded-[2px] border-[1.5px] border-ink bg-ticket font-ticket text-[15px] font-bold",
                    s.startsAt === startsAt && "bg-ink text-paper",
                  )}
                >
                  {timeOf(s.startsAt, timezone)}
                </button>
              ))}
            </div>
          )}
        </fieldset>
        <Field id="mb-notes" label="Nota (opcional)">
          <input id="mb-notes" className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: cliente habitual" maxLength={200} />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-signal-ink">
            — {error}
          </p>
        )}
      </form>
    </SidePanel>
  );
}
