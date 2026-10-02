import { LedChip } from "@/components/brand/led";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Slot = { time: string; who: string; detail: string; state?: "done" | "live" | "held" | "noshow" };

const COLUMNS: { barber: string; slots: Slot[] }[] = [
  {
    barber: "Julio",
    slots: [
      { time: "10:30", who: "Dani", detail: "Corte + barba", state: "done" },
      { time: "16:30", who: "Leo", detail: "Corte", state: "held" },
      { time: "18:00", who: "Fede", detail: "Perfilado" },
    ],
  },
  {
    barber: "Marcos",
    slots: [
      { time: "12:00", who: "Fede", detail: "Corte", state: "noshow" },
      { time: "15:30", who: "Dani", detail: "Corte + barba", state: "live" },
      { time: "17:00", who: "Leo", detail: "Perfilado" },
    ],
  },
  {
    barber: "Sofi",
    slots: [
      { time: "11:00", who: "Caro", detail: "Corte", state: "done" },
      { time: "16:00", who: "Nico", detail: "Corte" },
    ],
  },
];

const FEATURES = [
  { title: "Agenda por día y semana", body: "Cada barbero en su columna, con la hora actual marcada." },
  { title: "Reserva manual", body: "Para el cliente que llama o está en el local." },
  { title: "Horario partido y bloqueos", body: "Mañana y tarde, vacaciones, feriados." },
  { title: "Señas y ausencias", body: "Cuánto cobraste y quién no vino." },
];

export function ForOwners() {
  return (
    <section id="para-el-dueno" className="scroll-mt-24">
      <div className="mx-auto max-w-[1296px] px-5 py-16 lg:px-0 lg:py-24">
        <p className="eyebrow text-muted-ink">Para el dueño</p>
        <h2 className="mt-3 max-w-[900px] font-display text-[40px] leading-[1.05] uppercase lg:text-[56px] lg:leading-none">
          Tu agenda, en el teléfono y en el mostrador.
        </h2>

        <div
          role="img"
          aria-label="Agenda de ejemplo del jueves: tres barberos, turnos atendidos, uno en curso a las 15:30 y uno retenido esperando el pago"
          className="mt-10 overflow-hidden border-[1.5px] border-ink bg-paper shadow-[0_18px_40px_rgba(0,0,0,.12)]"
        >
          <div className="flex items-center justify-between border-b border-machine px-5 py-3">
            <div className="flex items-center gap-4">
              <Logo className="hidden text-lg sm:block" />
              <span className="font-display text-xl uppercase">Agenda · jueves 1</span>
            </div>
            <LedChip>AHORA 15:30</LedChip>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
            {COLUMNS.map((col) => (
              <div key={col.barber} className="flex flex-col gap-2">
                <span className="eyebrow text-xs">{col.barber}</span>
                {col.slots.map((s) => (
                  <SlotRow key={s.time} slot={s} />
                ))}
              </div>
            ))}
          </div>
          <p className="px-5 pb-3 text-xs text-muted-ink">Agenda de ejemplo · Barbería Don Julio (demo)</p>
        </div>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <b>{f.title}</b>
              <p className="mt-1 text-sm text-muted-ink">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const BADGE: Record<NonNullable<Slot["state"]>, { text: string; className: string }> = {
  done: { text: "Atendido", className: "bg-ink text-paper" },
  live: { text: "En curso", className: "bg-ok-soft text-ok" },
  held: { text: "Retenido", className: "border-[1.5px] border-dashed border-ink" },
  noshow: { text: "No vino", className: "bg-signal-soft text-signal-ink" },
};

function SlotRow({ slot }: { slot: Slot }) {
  const badge = slot.state ? BADGE[slot.state] : { text: "Confirmado", className: "bg-ok-soft text-ok" };
  return (
    <div
      className={cn(
        "ticket flex items-center justify-between gap-2 px-3 py-2 text-[13px]",
        slot.state === "done" && "opacity-85",
        slot.state === "live" && "shadow-[inset_4px_0_0_var(--color-led-on),0_10px_24px_rgba(0,0,0,.12)]",
      )}
    >
      <span className="min-w-0 truncate">
        <b>{slot.time}</b> {slot.who} · {slot.detail}
      </span>
      {slot.state === "held" ? (
        <LedChip className="text-xs">07:12</LedChip>
      ) : (
        <span className={cn("shrink-0 rounded-[2px] px-1.5 py-0.5 font-sans text-[10px] font-bold tracking-wider uppercase", badge.className)}>
          {badge.text}
        </span>
      )}
    </div>
  );
}

