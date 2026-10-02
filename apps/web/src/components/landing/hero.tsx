import Link from "next/link";
import { Dispenser } from "@/components/brand/dispenser";
import { Led, LedChip } from "@/components/brand/led";
import { Stamp } from "@/components/brand/stamp";
import { Barcode, Ticket } from "@/components/brand/ticket";
import { buttonVariants } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-[1296px] gap-12 px-5 pt-7 pb-20 lg:grid-cols-[6fr_5fr] lg:gap-14 [&>*]:min-w-0 lg:px-0 lg:pt-16 lg:pb-28">
      <div className="flex flex-col gap-5 lg:gap-6">
        <Led label={"Ahora\natendiendo"} className="self-start" valueClassName="text-[22px] min-[400px]:text-[26px] lg:text-[46px]">
          15:30 Â· MARCOS
        </Led>
        <h1 className="font-display text-[52px] leading-[1.06] uppercase sm:text-[56px] lg:text-[104px] lg:leading-[1.02]">
          Cada turno tiene un solo dueÃ±o.
        </h1>
        <p className="max-w-[600px] text-[17px] leading-relaxed text-ink-2 lg:text-xl">
          Tu cliente reserva desde tu link, paga la seÃ±a por Mercado Pago y recibe un ticket confirmado. Nadie mÃ¡s
          puede tomar ese horario.
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/registro" className={buttonVariants({ size: "lg" })}>
            Crea tu barberÃ­a
          </Link>
          <Link href="/b/don-julio" className={buttonVariants({ variant: "ghost", className: "text-[17px]" })}>
            â€” Sacar un turno en la demo
          </Link>
        </div>
        <p className="text-sm text-muted-ink">Sin fila, sin llamadas. Funciona desde el telÃ©fono, sin instalar nada.</p>
      </div>

      <figure className="relative mx-auto w-full max-w-[350px] lg:mx-0 lg:max-w-[560px]" aria-label="Ticket de ejemplo de BarberÃ­a Don Julio">
        <div className="flex w-[300px] flex-col items-center lg:w-[400px]">
        <Dispenser className="h-24 w-[300px] lg:h-[124px] lg:w-[400px]">
          <span className="font-display text-base tracking-[.08em] lg:text-xl">TOME SU NÃšMERO</span>
          <LedChip className="lg:text-xl">RETENIDO 09:58</LedChip>
        </Dispenser>
        <Ticket className="animate-print -mt-1 w-[250px] p-[22px] text-[13.5px] lg:w-[300px] lg:text-[14.5px]">
          <b className="block text-center">BARBERÃA DON JULIO (DEMO)</b>
          <span className="block text-center text-xs text-muted-ink">â€” ticket de ejemplo â€”</span>
          <b className="mt-2.5 mb-1.5 block text-center font-led text-[40px] leading-none lg:text-5xl">15:30</b>
          Corte + barba Â· 45 min
          <br />
          Barbero: cualquiera â†’ Marcos
          <br />
          SeÃ±a: $ 3.000 Â· Mercado Pago âœ“
          <br />
          <b>ESTADO: CONFIRMADO</b>
          <br />
          Recordatorio: 24 h antes
          <Barcode value="TURNIA1530" className="mt-2 text-center text-4xl lg:text-[44px]" />
        </Ticket>
        </div>
        <Ticket className="animate-print-late absolute top-[300px] right-0 w-[160px] rotate-[7deg] px-3.5 py-3 text-[13px] lg:top-[230px] lg:w-[220px] lg:rotate-6 lg:px-[18px] lg:py-4 lg:text-[14.5px]">
          TURNO 15:30
          <br />
          <b>YA TOMADO</b>
          <br />
          elige otro horario
          <Stamp kind="slot_taken" className="mt-2 block w-fit text-[22px] lg:text-[26px]">
            409
          </Stamp>
        </Ticket>
      </figure>
    </section>
  );
}
