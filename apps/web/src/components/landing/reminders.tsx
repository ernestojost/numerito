import { Led } from "@/components/brand/led";
import { Logo } from "@/components/brand/logo";
import { Ticket } from "@/components/brand/ticket";

export function Reminders() {
  return (
    <section className="ticket bg-ticket font-sans text-base shadow-none">
      <div className="mx-auto grid max-w-[1296px] gap-12 px-5 py-16 lg:grid-cols-[5fr_6fr] lg:gap-16 lg:px-0 lg:py-24">
        <div className="flex flex-col gap-5">
          <p className="eyebrow text-muted-ink">Recordatorios</p>
          <h2 className="font-display text-[40px] leading-[1.05] uppercase lg:text-[56px] lg:leading-none">
            Un recordatorio 24 horas antes, sin que escribas nada.
          </h2>
          <p className="text-base leading-relaxed text-ink-2 lg:text-lg">
            Confirmación al reservar, recordatorio el día anterior y aviso si se cancela. Por email; WhatsApp opcional.
          </p>
        </div>
        <figure className="flex flex-col items-center gap-2.5">
          <div className="flex w-full max-w-[460px] flex-col gap-3.5 bg-paper px-6 pt-[22px] pb-[26px] shadow-[0_18px_40px_rgba(0,0,0,.14)]">
            <div className="flex items-center justify-between">
              <Logo className="text-xl" />
              <span className="eyebrow text-xs text-muted-ink">Recordatorio · mañana</span>
            </div>
            <Led label="Mañana" valueClassName="text-[28px] lg:text-[32px]">
              16:30
            </Led>
            <Ticket className="px-[18px] pt-4 pb-5">
              Jue 1 oct · <b>16:30</b>
              <br />
              Corte + barba · con Marcos
              <br />
              Barbería Don Julio
            </Ticket>
            <p className="text-sm text-ink-2">
              Te esperamos. Si no puedes venir, cancela hoy antes de las 16:30 para que el horario quede libre.
            </p>
          </div>
          <figcaption className="text-[13px] text-muted-ink">Email de ejemplo de la barbería demo.</figcaption>
        </figure>
      </div>
    </section>
  );
}
