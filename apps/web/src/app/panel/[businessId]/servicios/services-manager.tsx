"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Service, ServiceInput, Staff } from "@numerito/shared";
import { Ticket } from "@/components/brand/ticket";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { SidePanel } from "@/components/ui/side-panel";
import { Switch } from "@/components/ui/switch";
import { ApiRequestError, api } from "@/lib/api";
import { formatMoney, parseMoney } from "@/lib/money";

type Editing = { mode: "new" } | { mode: "edit"; service: Service } | null;

export function ServicesManager({ businessId, services, staff }: { businessId: string; services: Service[]; staff: Staff[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const staffName = new Map(staff.map((s) => [s.id, s.displayName]));

  async function toggleActive(service: Service, active: boolean) {
    await api(`/businesses/${businessId}/services/${service.id}`, { method: "PATCH", body: { active } });
    router.refresh();
  }

  return (
    <main className="px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-[32px] leading-none uppercase">Servicios</h1>
        <Button className="ml-auto" onClick={() => setEditing({ mode: "new" })}>
          + Nuevo servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState onCreate={() => setEditing({ mode: "new" })} />
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[15px]">
            <thead>
              <tr className="eyebrow text-left text-xs text-muted-ink">
                <th className="border-b border-machine px-3 pb-2.5 font-bold">Servicio</th>
                <th className="border-b border-machine px-3 pb-2.5 font-bold">Duración</th>
                <th className="border-b border-machine px-3 pb-2.5 font-bold">Limpieza</th>
                <th className="border-b border-machine px-3 pb-2.5 font-bold">Precio</th>
                <th className="border-b border-machine px-3 pb-2.5 font-bold">Seña</th>
                <th className="border-b border-machine px-3 pb-2.5 font-bold">Barberos</th>
                <th className="border-b border-machine px-3 pb-2.5 font-bold">Activo</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className={s.active ? undefined : "text-muted-ink"}>
                  <td className="h-[60px] border-b border-machine px-3">
                    <button type="button" className="text-left font-bold underline-offset-4 hover:underline" onClick={() => setEditing({ mode: "edit", service: s })}>
                      {s.name}
                    </button>
                  </td>
                  <td className="border-b border-machine px-3 font-ticket font-bold">{s.durationMinutes} min</td>
                  <td className="border-b border-machine px-3 font-ticket font-bold">{s.bufferMinutes} min</td>
                  <td className="border-b border-machine px-3 font-ticket font-bold">{formatMoney(s.priceCents)}</td>
                  <td className="border-b border-machine px-3 font-ticket font-bold">
                    {s.depositCents === null ? <span className="font-sans font-normal text-muted-ink">General</span> : formatMoney(s.depositCents)}
                  </td>
                  <td className="border-b border-machine px-3 text-sm">
                    {s.staffIds.length ? s.staffIds.map((id) => staffName.get(id)).join(", ") : <span className="text-muted-ink">Nadie todavía</span>}
                  </td>
                  <td className="border-b border-machine px-3">
                    <Switch checked={s.active} label={`${s.name} activo`} onChange={(v) => void toggleActive(s, v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-muted-ink">
            La limpieza es el tiempo entre turnos: bloquea la agenda pero el cliente no lo ve. Qué barbero hace cada servicio se
            elige en Barberos.
          </p>
        </div>
      )}

      {editing && (
        <ServiceForm
          businessId={businessId}
          service={editing.mode === "edit" ? editing.service : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </main>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-start gap-4">
      <Ticket tear="bottom" className="w-[300px] px-5 pt-5 pb-6">
        <b className="block font-display text-xl uppercase">Sin servicios</b>
        <span className="text-[13px] text-muted-ink">Carga lo que ofreces, por ejemplo: Corte · 30 min · $ 6.000.</span>
      </Ticket>
      <Button variant="outline" onClick={onCreate}>
        Cargar el primero
      </Button>
    </div>
  );
}

function ServiceForm({
  businessId,
  service,
  onClose,
  onSaved,
}: {
  businessId: string;
  service: Service | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [duration, setDuration] = useState(String(service?.durationMinutes ?? 30));
  const [buffer, setBuffer] = useState(String(service?.bufferMinutes ?? 10));
  const [price, setPrice] = useState(service ? String(service.priceCents / 100) : "");
  const [ownDeposit, setOwnDeposit] = useState(service?.depositCents != null);
  const [deposit, setDeposit] = useState(service?.depositCents != null ? String(service.depositCents / 100) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const priceCents = parseMoney(price);
    const depositCents = ownDeposit ? parseMoney(deposit) : null;
    if (name.trim().length < 2) next.name = "Escribe el nombre del servicio";
    if (!(Number(duration) >= 5)) next.duration = "Mínimo 5 minutos";
    if (!(Number(buffer) >= 0)) next.buffer = "Escribe 0 o más";
    if (priceCents === null) next.price = "Escribe el precio sin centavos, por ejemplo 6000";
    if (ownDeposit && depositCents === null) next.deposit = "Escribe el monto de la seña";
    if (ownDeposit && depositCents !== null && priceCents !== null && depositCents > priceCents) {
      next.deposit = "La seña no puede ser mayor que el precio";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const body: ServiceInput = {
      name: name.trim(),
      durationMinutes: Number(duration),
      bufferMinutes: Number(buffer),
      priceCents: priceCents!,
      depositCents,
    };
    setSaving(true);
    try {
      if (service) await api(`/businesses/${businessId}/services/${service.id}`, { method: "PATCH", body });
      else await api(`/businesses/${businessId}/services`, { method: "POST", body });
      onSaved();
    } catch (err) {
      setErrors({ form: err instanceof ApiRequestError ? err.message : "No se pudo guardar. Prueba de nuevo." });
      setSaving(false);
    }
  }

  async function remove() {
    if (!service) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await api(`/businesses/${businessId}/services/${service.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <SidePanel
      title={service ? service.name : "Nuevo servicio"}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" form="service-form" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          {service && (
            <Button variant="ghost" className="text-signal-ink" onClick={() => void remove()}>
              {confirmDelete ? "Sí, eliminar servicio" : "— Eliminar servicio"}
            </Button>
          )}
        </div>
      }
    >
      <form id="service-form" onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field id="svc-name" label="Nombre" error={errors.name}>
          <input id="svc-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Corte + barba" aria-invalid={!!errors.name} />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field id="svc-duration" label="Duración (min)" error={errors.duration}>
            <input id="svc-duration" inputMode="numeric" className={`${inputClass} font-ticket font-bold`} value={duration} onChange={(e) => setDuration(e.target.value)} aria-invalid={!!errors.duration} />
          </Field>
          <Field id="svc-buffer" label="Limpieza (min)" error={errors.buffer}>
            <input id="svc-buffer" inputMode="numeric" className={`${inputClass} font-ticket font-bold`} value={buffer} onChange={(e) => setBuffer(e.target.value)} aria-invalid={!!errors.buffer} />
          </Field>
        </div>
        <Field id="svc-price" label="Precio ($)" error={errors.price}>
          <input id="svc-price" inputMode="numeric" className={`${inputClass} font-ticket font-bold`} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej.: 9000" aria-invalid={!!errors.price} />
        </Field>
        <fieldset className="flex flex-col gap-2.5">
          <legend className="eyebrow mb-1.5">Seña</legend>
          <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
            <input type="radio" name="deposit" className="size-5 accent-ink" checked={!ownDeposit} onChange={() => setOwnDeposit(false)} />
            Usar la seña general de la barbería
          </label>
          <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
            <input type="radio" name="deposit" className="size-5 accent-ink" checked={ownDeposit} onChange={() => setOwnDeposit(true)} />
            Seña propia para este servicio
          </label>
          {ownDeposit && (
            <Field id="svc-deposit" label="Monto de la seña ($)" error={errors.deposit}>
              <input id="svc-deposit" inputMode="numeric" className={`${inputClass} font-ticket font-bold`} value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="Ej.: 3000" aria-invalid={!!errors.deposit} />
            </Field>
          )}
        </fieldset>
        {errors.form && (
          <p role="alert" className="text-sm text-signal-ink">
            — {errors.form}
          </p>
        )}
      </form>
    </SidePanel>
  );
}
