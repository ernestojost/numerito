import { Dispenser } from "@/components/brand/dispenser";
import { LedChip } from "@/components/brand/led";
import { Stamp } from "@/components/brand/stamp";
import { Ticket } from "@/components/brand/ticket";
import { cn } from "@/lib/utils";

const REQUESTS = [
  { name: "Nico", at: "16:30:00.412", won: true },
  { name: "Dani", at: "16:30:00.413", won: false },
];

export function DoubleBooking() {
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto grid max-w-[1296px] gap-12 px-5 py-16 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-0 lg:py-24">
        <div className="flex flex-col gap-5">
          <p className="eyebrow text-machine">La regla de oro</p>
          <h2 className="font-display text-[40px] leading-[1.05] uppercase lg:text-[64px] lg:leading-none">
            Dos personas no pueden tomar el mismo turno.
          </h2>
          <p className="text-base leading-relaxed text-machine lg:text-lg">
            La regla vive en la base de datos, no en una app que puede fallar. Si dos pedidos llegan al mismo instante al
            mismo horario, uno se confirma y el otro recibe &ldquo;ya tomado&rdquo;. Sin agendas fantasma, sin retenciones
            eternas.
          </p>
          <Ticket tear="none" className="mt-2 max-w-[440px] px-[18px] py-4 text-[13px]">
            Mecanismo: Postgres · exclusion constraint sobre (barbero, rango horario).
            <br />
            Test de integración: 20 pedidos simultáneos al mismo horario → 1 confirmado, 19 rechazados.
          </Ticket>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 lg:pt-5">
          {REQUESTS.map((r) => (
            <div key={r.name} className="flex flex-col items-center">
              <p className="eyebrow mb-3.5 text-xs text-machine">{r.name} pide 16:30 · Marcos</p>
              <Dispenser className="h-[72px] w-[260px] lg:h-24 lg:w-[280px]">
                <LedChip>{r.at}</LedChip>
              </Dispenser>
              <Ticket className={cn("-mt-1 w-[230px] px-5 pt-5 pb-6", !r.won && "rotate-3")}>
                <b className="block font-led text-4xl leading-none lg:text-[44px]">16:30</b>
                {r.name}
                <br />
                Corte · Marcos
                <br />
                {r.won ? "Seña $ 3.000 ✓" : <b>YA TOMADO</b>}
                <br />
                <Stamp
                  kind={r.won ? "confirmed" : "slot_taken"}
                  className="mt-3 text-lg lg:text-[22px]"
                />
              </Ticket>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
