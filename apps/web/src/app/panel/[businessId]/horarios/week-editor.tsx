"use client";

import { useState } from "react";
import { type TimeRange, WeeklyScheduleSchema } from "@numerito/shared";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

/** Monday first, as agendas are printed; weekday numbers follow JS (0 = Sunday). */
export const WEEK = [
  { weekday: 1, label: "Lunes" },
  { weekday: 2, label: "Martes" },
  { weekday: 3, label: "Miércoles" },
  { weekday: 4, label: "Jueves" },
  { weekday: 5, label: "Viernes" },
  { weekday: 6, label: "Sábado" },
  { weekday: 0, label: "Domingo" },
];

type Draft = { weekday: number; start: string; end: string; key: number };
let nextKey = 0;
const withKeys = (ranges: TimeRange[]): Draft[] => ranges.map((r) => ({ ...r, key: nextKey++ }));

export function WeekEditor({
  initial,
  onSave,
  saveLabel = "Guardar horario",
}: {
  initial: TimeRange[];
  onSave: (week: TimeRange[]) => Promise<void>;
  saveLabel?: string;
}) {
  const [ranges, setRanges] = useState<Draft[]>(() => withKeys(initial));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const change = (fn: (r: Draft[]) => Draft[]) => {
    setRanges(fn);
    setStatus("idle");
  };

  function toggleDay(weekday: number, open: boolean) {
    change((r) =>
      open
        ? [...r, { weekday, start: "09:00", end: "13:00", key: nextKey++ }, { weekday, start: "16:00", end: "20:00", key: nextKey++ }]
        : r.filter((x) => x.weekday !== weekday),
    );
  }

  function addRange(weekday: number) {
    change((r) => {
      const last = r.filter((x) => x.weekday === weekday).sort((a, b) => a.start.localeCompare(b.start)).at(-1);
      const start = last ? last.end : "09:00";
      const end = start < "22:00" ? `${String(Math.min(23, Number(start.slice(0, 2)) + 2)).padStart(2, "0")}:00` : "23:59";
      return [...r, { weekday, start, end, key: nextKey++ }];
    });
  }

  async function save() {
    const week = ranges.map(({ weekday, start, end }) => ({ weekday, start, end }));
    const parsed = WeeklyScheduleSchema.safeParse(week);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.message.replace(/del día (\d)/, (_, d) => `del ${WEEK.find((w) => w.weekday === Number(d))?.label.toLowerCase()}`) ?? "Revisa los horarios");
      return;
    }
    setError(null);
    setStatus("saving");
    try {
      await onSave(parsed.data);
      setStatus("saved");
    } catch {
      setError("No se pudo guardar. Prueba de nuevo.");
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-col">
      {WEEK.map(({ weekday, label }) => {
        const day = ranges.filter((r) => r.weekday === weekday).sort((a, b) => a.start.localeCompare(b.start));
        const open = day.length > 0;
        return (
          <div key={weekday} className="grid grid-cols-[110px_56px_1fr] items-center gap-3 border-b border-machine py-3 sm:grid-cols-[130px_64px_1fr]">
            <b>{label}</b>
            <Switch checked={open} onChange={(v) => toggleDay(weekday, v)} label={`${label} abierto`} />
            <div className="flex flex-wrap items-center gap-2.5">
              {!open && <span className="text-muted-ink">Cerrado</span>}
              {day.map((r) => (
                <span key={r.key} className="flex items-center gap-1.5">
                  <input
                    type="time"
                    aria-label={`${label}, desde`}
                    className={`${inputClass} min-h-10 w-[106px] px-2 font-ticket font-bold`}
                    value={r.start}
                    onChange={(e) => change((all) => all.map((x) => (x.key === r.key ? { ...x, start: e.target.value } : x)))}
                  />
                  <span aria-hidden>–</span>
                  <input
                    type="time"
                    aria-label={`${label}, hasta`}
                    className={`${inputClass} min-h-10 w-[106px] px-2 font-ticket font-bold`}
                    value={r.end}
                    onChange={(e) => change((all) => all.map((x) => (x.key === r.key ? { ...x, end: e.target.value } : x)))}
                  />
                  <button
                    type="button"
                    aria-label={`Quitar franja de ${r.start} a ${r.end}`}
                    className="min-h-10 min-w-10 font-ticket text-lg text-muted-ink hover:text-signal-ink"
                    onClick={() => change((all) => all.filter((x) => x.key !== r.key))}
                  >
                    ×
                  </button>
                </span>
              ))}
              {open && day.length < 4 && (
                <Button variant="ghost" size="sm" onClick={() => addRange(weekday)}>
                  + Franja
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {error && (
        <p role="alert" className="mt-3 text-sm text-signal-ink">
          — {error}
        </p>
      )}
      <div className="mt-5 flex items-center gap-4">
        <Button onClick={() => void save()} disabled={status === "saving"}>
          {status === "saving" ? "Guardando…" : saveLabel}
        </Button>
        {status === "saved" && (
          <span role="status" className="text-sm font-bold text-ok">
            Guardado
          </span>
        )}
      </div>
    </div>
  );
}
