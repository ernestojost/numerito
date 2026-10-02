"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TimeRange } from "@numerito/shared";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { WeekEditor } from "./week-editor";

export function BusinessHours({ businessId, initial }: { businessId: string; initial: TimeRange[] }) {
  const router = useRouter();
  return (
    <WeekEditor
      initial={initial}
      onSave={async (week) => {
        await api(`/businesses/${businessId}/hours`, { method: "PUT", body: week });
        router.refresh();
      }}
    />
  );
}

export function StaffHours({
  businessId,
  staffId,
  name,
  initial,
  businessHours,
}: {
  businessId: string;
  staffId: string;
  name: string;
  initial: TimeRange[];
  /** Starting point when the barber gets their own hours for the first time. */
  businessHours: TimeRange[];
}) {
  const router = useRouter();
  const [own, setOwn] = useState(initial.length > 0);
  const url = `/businesses/${businessId}/staff/${staffId}/schedule`;

  async function resetToBusinessHours() {
    await api(url, { method: "PUT", body: [] });
    setOwn(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center gap-3">
        <Switch checked={own} onChange={(v) => (v ? setOwn(true) : void resetToBusinessHours())} label={`${name} tiene horario propio`} />
        <span>{own ? `${name} tiene horario propio` : `${name} usa el horario de la barbería`}</span>
      </div>
      {own && (
        <WeekEditor
          initial={initial.length > 0 ? initial : businessHours}
          saveLabel={`Guardar horario de ${name}`}
          onSave={async (week) => {
            await api(url, { method: "PUT", body: week });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
