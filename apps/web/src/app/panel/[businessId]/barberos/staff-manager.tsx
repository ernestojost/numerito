"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Service, Staff, StaffInput } from "@numerito/shared";
import { Ticket, TicketRule } from "@/components/brand/ticket";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { SidePanel } from "@/components/ui/side-panel";
import { Switch } from "@/components/ui/switch";
import { ApiRequestError, api } from "@/lib/api";

type Editing = { mode: "new" } | { mode: "edit"; member: Staff } | null;

export function StaffManager({ businessId, staff, services }: { businessId: string; staff: Staff[]; services: Service[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const serviceName = new Map(services.map((s) => [s.id, s.name]));

  return (
    <main className="px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-[32px] leading-none uppercase">Barberos</h1>
        <Button className="ml-auto" onClick={() => setEditing({ mode: "new" })}>
          + Agregar barbero
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-4">
          <Ticket tear="bottom" className="w-[300px] px-5 pt-5 pb-6">
            <b className="block font-display text-xl uppercase">Sin barberos</b>
            <span className="text-[13px] text-muted-ink">
              Agrega a quienes atienden, aunque seas solo tú. Cada barbero tiene su columna en la agenda.
            </span>
          </Ticket>
          <Button variant="outline" onClick={() => setEditing({ mode: "new" })}>
            Agregar el primero
          </Button>
        </div>
      ) : (
        <ul className="mt-7 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((m, i) => (
            <Ticket key={m.id} as="li" className={`flex flex-col gap-3 px-6 pt-6 pb-7 font-sans text-[15px] ${m.active ? "" : "opacity-60"}`}>
              <span className="absolute top-5 right-5 font-ticket text-[13px] text-muted-ink">SILLÓN {i + 1}</span>
              <span className="inline-flex size-14 items-center justify-center rounded-full bg-ink text-lg font-bold text-paper">
                {m.displayName.slice(0, 2).toUpperCase()}
              </span>
              <h2 className="font-display text-2xl uppercase">{m.displayName}</h2>
              {m.email && <span className="text-sm text-muted-ink">{m.email}</span>}
              {!m.active && <span className="eyebrow text-xs text-muted-ink">Inactivo</span>}
              <TicketRule />
              <span>
                <b className="eyebrow text-xs">Hace</b>
                <br />
                {m.serviceIds.length ? m.serviceIds.map((id) => serviceName.get(id)).join(" · ") : <span className="text-muted-ink">Ningún servicio todavía</span>}
              </span>
              <span>
                <b className="eyebrow text-xs">Horario</b>
                <br />
                {m.usesBusinessHours ? "Usa el de la barbería" : "Horario propio"}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setEditing({ mode: "edit", member: m })}>
                  Editar
                </Button>
                <Link href={`/panel/${businessId}/horarios?barbero=${m.id}`} className={buttonVariants({ variant: "ghost" })}>
                  Su horario
                </Link>
              </div>
            </Ticket>
          ))}
        </ul>
      )}

      {editing && (
        <StaffForm
          businessId={businessId}
          member={editing.mode === "edit" ? editing.member : null}
          services={services}
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

function StaffForm({
  businessId,
  member,
  services,
  onClose,
  onSaved,
}: {
  businessId: string;
  member: Staff | null;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member?.displayName ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [active, setActive] = useState(member?.active ?? true);
  const [serviceIds, setServiceIds] = useState<string[]>(member?.serviceIds ?? services.map((s) => s.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleService(id: string) {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Escribe el nombre";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Email inválido";
    setErrors(next);
    if (Object.keys(next).length) return;

    const body: StaffInput = { displayName: name.trim(), email: email.trim() || null, active, serviceIds };
    setSaving(true);
    try {
      if (member) await api(`/businesses/${businessId}/staff/${member.id}`, { method: "PATCH", body });
      else await api(`/businesses/${businessId}/staff`, { method: "POST", body });
      onSaved();
    } catch (err) {
      setErrors({ form: err instanceof ApiRequestError ? err.message : "No se pudo guardar. Prueba de nuevo." });
      setSaving(false);
    }
  }

  async function remove() {
    if (!member) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await api(`/businesses/${businessId}/staff/${member.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <SidePanel
      title={member ? member.displayName : "Nuevo barbero"}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" form="staff-form" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          {member && (
            <Button variant="ghost" className="text-signal-ink" onClick={() => void remove()}>
              {confirmDelete ? "Sí, eliminar barbero" : "— Eliminar barbero"}
            </Button>
          )}
        </div>
      }
    >
      <form id="staff-form" onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field id="staff-name" label="Nombre" error={errors.name}>
          <input id="staff-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Marcos" aria-invalid={!!errors.name} />
        </Field>
        <Field id="staff-email" label="Email (opcional)" help="Más adelante vas a poder invitarlo para que vea su agenda." error={errors.email}>
          <input id="staff-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ej.: marcos@email.com" aria-invalid={!!errors.email} />
        </Field>
        <fieldset className="flex flex-col gap-1">
          <legend className="eyebrow mb-1.5">Servicios que hace</legend>
          {services.length === 0 && <p className="text-sm text-muted-ink">Todavía no cargaste servicios.</p>}
          {services.map((s) => (
            <label key={s.id} className="flex min-h-11 items-center gap-2.5 text-[15px]">
              <input type="checkbox" className="size-5 accent-ink" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
              {s.name}
            </label>
          ))}
        </fieldset>
        <div className="flex min-h-11 items-center gap-3 text-[15px]">
          <Switch checked={active} onChange={setActive} label="Atiende" />
          Atiende (si lo apagas, no aparece para reservar)
        </div>
        {errors.form && (
          <p role="alert" className="text-sm text-signal-ink">
            — {errors.form}
          </p>
        )}
      </form>
    </SidePanel>
  );
}
