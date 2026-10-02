import { Stamp } from "@/components/brand/stamp";
import { Ticket, TicketRule } from "@/components/brand/ticket";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 border-t border-machine">
      <div className="mx-auto max-w-[1296px] px-5 py-16 lg:px-0 lg:py-24">
        <p className="eyebrow text-muted-ink">Cómo funciona</p>
        <h2 className="mt-3 font-display text-[40px] leading-[1.05] uppercase lg:text-[56px] lg:leading-none">
          Tres pasos. Ninguna llamada.
        </h2>
        <ol className="mt-10 grid gap-4 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          <Step n="01" title="Compartes tu link">
            Pones <b className="font-ticket">turnia.app/b/don-julio</b> en tu bio de Instagram o lo mandas por WhatsApp.
            Es tu página de turnos, abierta 24 h.
            <TicketRule />
            <span className="text-[13px] text-muted-ink">link de ejemplo</span>
          </Step>
          <Step n="02" title="Tu cliente elige y paga la seña">
            Servicio, barbero y horario en menos de un minuto. Paga la seña por Mercado Pago y el turno queda retenido 10
            minutos mientras paga.
            <TicketRule />
            <span className="inline-flex rounded-[2px] bg-mp px-2 py-0.5 text-xs font-bold tracking-wider text-ink uppercase">
              Mercado Pago
            </span>
          </Step>
          <Step n="03" title="Recibe el ticket, tú ves la agenda">
            Confirmación al instante y recordatorio 24 h antes. Tú lo ves en tu agenda desde el teléfono, entre un cliente
            y otro.
            <TicketRule />
            <Stamp kind="confirmed" className="border-2 px-1.5 text-[15px]" />
          </Step>
        </ol>
      </div>
    </section>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Ticket as="li" className="flex flex-col gap-3 px-6 pt-7 pb-8">
      <span className="font-led text-4xl leading-none font-bold lg:text-[44px]">{n}</span>
      <h3 className="font-display text-2xl leading-[1.1] uppercase lg:text-[28px]">{title}</h3>
      <div className="font-sans text-[15px] text-ink-2 lg:text-base">{children}</div>
    </Ticket>
  );
}
