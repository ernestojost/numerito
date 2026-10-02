import Link from "next/link";
import { Led } from "@/components/brand/led";
import { Stamp } from "@/components/brand/stamp";
import { Ticket, TicketRule } from "@/components/brand/ticket";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Deposit() {
  return (
    <section id="sena" className="scroll-mt-24">
      <div className="mx-auto grid max-w-[1296px] gap-12 px-5 py-16 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-0 lg:py-24">
        <div className="flex flex-col gap-5">
          <p className="eyebrow text-muted-ink">La seña</p>
          <h2 className="font-display text-[40px] leading-[1.05] uppercase lg:text-[56px] lg:leading-none">
            Cobra la seña antes de que se siente.
          </h2>
          <p className="text-base leading-relaxed text-ink-2 lg:text-lg">
            Tú decides cuánto: un monto fijo o un porcentaje del servicio. Se paga por Mercado Pago al reservar. Si el
            cliente no viene, la seña se queda contigo.
          </p>
          <ul className="flex flex-col gap-2.5 text-[15px] lg:text-[17px]">
            <li>— El turno se retiene 10 minutos mientras paga.</li>
            <li>— Si no paga, se libera solo.</li>
            <li>— Tu cliente puede cancelar hasta las horas que tú definas.</li>
          </ul>
          <Link href="/b/don-julio" className={buttonVariants({ variant: "outline", className: "mt-2 self-start" })}>
            Ver cómo se ve la reserva
          </Link>
        </div>

        <div className="flex justify-center">
          <div
            role="img"
            aria-label="Pantalla de pago de ejemplo: turno de las 16:30 retenido, seña de $ 3.000"
            className="flex w-[310px] flex-col gap-3.5 overflow-hidden rounded-[36px] border-8 border-ink bg-paper px-4 py-[18px] shadow-[0_20px_60px_rgba(0,0,0,.15)] lg:w-[356px]"
          >
            <p className="eyebrow">Pago de seña</p>
            <Led label={"Turno\nretenido"} valueClassName="text-[28px] lg:text-[32px]">
              09:58
            </Led>
            <Ticket className="px-[18px] pt-[18px] pb-[22px] text-[13.5px]">
              <b>BARBERÍA DON JULIO (DEMO)</b>
              <b className="my-2 block font-led text-[42px] leading-none">16:30</b>
              Jue 1 oct 2026
              <br />
              Corte + barba · 45 min
              <br />
              A nombre de: Nico
              <Stamp kind="pending_payment" className="absolute top-[52px] right-3 text-lg" />
              <TicketRule />
              <Row label="Corte + barba" value="$ 9.000" />
              <Row label="Seña ahora" value="$ 3.000" bold />
              <Row label="Resto en el local" value="$ 6.000" />
            </Ticket>
            <span className={buttonVariants({ variant: "mp", size: "lg", className: "w-full text-base" })}>
              <span className="inline-flex size-[26px] items-center justify-center rounded-[2px] bg-white text-[11px]">
                MP
              </span>
              Pagar seña con Mercado Pago
            </span>
            <p className="text-center text-[13px] text-muted-ink">Si no pagas en 10 minutos el turno se libera.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between", bold && "font-bold")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
