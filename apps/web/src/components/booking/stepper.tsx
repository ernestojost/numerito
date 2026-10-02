import { cn } from "@/lib/utils";

const STEPS = ["Servicio", "Barbero", "Horario", "Seña"];

/** Perforated paper strip: one hole per step, the current one punched in red. */
export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-2.5">
      <ol className="flex items-center" aria-label={`Paso ${current} de 4`}>
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center">
            {i > 0 && <span aria-hidden className="w-[18px] border-t-[1.5px] border-dashed border-machine" />}
            <span
              aria-current={i + 1 === current ? "step" : undefined}
              title={step}
              className={cn(
                "block size-2.5 rounded-full border-[1.5px] border-ink bg-ticket",
                i + 1 < current && "bg-ink",
                i + 1 === current && "border-signal bg-signal",
              )}
            />
          </li>
        ))}
      </ol>
      <span className="eyebrow text-xs">
        Paso {current} de 4 · {STEPS[current - 1]}
      </span>
    </div>
  );
}
