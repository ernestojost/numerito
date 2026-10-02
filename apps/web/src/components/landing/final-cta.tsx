import Link from "next/link";
import { Led } from "@/components/brand/led";
import { buttonVariants } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto flex max-w-[1296px] flex-col items-center gap-6 px-5 py-14 text-center lg:py-[72px]">
        <Led valueClassName="text-2xl lg:text-[46px]">TOME SU NÚMERO</Led>
        <h2 className="font-display text-[40px] leading-[1.05] uppercase lg:text-7xl">Abre tu agenda hoy.</h2>
        <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <Link href="/registro" className={buttonVariants({ size: "lg" })}>
            Crea tu barbería
          </Link>
          <Link href="/entrar" className={buttonVariants({ variant: "ghost", className: "text-paper" })}>
            — Entrar
          </Link>
        </div>
      </div>
    </section>
  );
}
