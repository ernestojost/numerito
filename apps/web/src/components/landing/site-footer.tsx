import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Barcode } from "@/components/brand/ticket";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#sena", label: "La seña" },
  { href: "/b/don-julio", label: "Demo" },
  { href: "/entrar", label: "Entrar" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-machine">
      <div className="mx-auto flex max-w-[1296px] flex-col gap-5 px-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-0">
        <Logo className="text-2xl" />
        <nav aria-label="Pie de página" className="eyebrow grid grid-cols-2 gap-3 text-xs sm:flex sm:gap-6">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="hover:text-signal-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          <span className="text-[13px] text-muted-ink">Hecho para barberías y peluquerías de Latinoamérica.</span>
          <Barcode value="NUMERITO" className="hidden text-[34px] lg:block" />
        </div>
      </div>
    </footer>
  );
}
