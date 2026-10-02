import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

const NAV = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#sena", label: "La seña" },
  { href: "#para-el-dueno", label: "Para el dueño" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-machine bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1296px] items-center justify-between px-5 lg:h-[88px] lg:px-0">
        <Link href="/" aria-label="Numerito, inicio">
          <Logo className="text-2xl lg:text-[30px]" />
        </Link>
        <nav aria-label="Secciones" className="eyebrow hidden gap-8 lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-signal-ink">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 lg:gap-3">
          <Link href="/entrar" className={buttonVariants({ variant: "ghost" })}>
            Entrar
          </Link>
          <Link href="/registro" className={buttonVariants({ className: "hidden sm:inline-flex" })}>
            Crea tu barbería
          </Link>
        </div>
      </div>
    </header>
  );
}
