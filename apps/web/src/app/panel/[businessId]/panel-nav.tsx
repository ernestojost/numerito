"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "", label: "Agenda", ready: true },
  { href: "/clientes", label: "Clientes", ready: false },
  { href: "/servicios", label: "Servicios", ready: true },
  { href: "/barberos", label: "Barberos", ready: true },
  { href: "/horarios", label: "Horarios", ready: true },
  { href: "/estadisticas", label: "Estadísticas", ready: false },
  { href: "/configuracion", label: "Configuración", ready: false },
];

export function PanelNav({ businessId, variant }: { businessId: string; variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const base = `/panel/${businessId}`;
  const items = ITEMS.filter((i) => i.ready || variant === "sidebar");

  return (
    <nav
      aria-label="Panel"
      className={variant === "sidebar" ? "mt-5 hidden flex-col lg:flex" : "flex gap-1 overflow-x-auto px-3 lg:hidden"}
    >
      {items.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.href === "" ? pathname === base : pathname.startsWith(href);
        if (!item.ready) {
          return (
            <span key={item.label} className="eyebrow flex min-h-11 items-center pl-6 text-muted-ink" title="Próximamente">
              {item.label}
            </span>
          );
        }
        return (
          <Link
            key={item.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "eyebrow flex min-h-11 shrink-0 items-center",
              variant === "sidebar" ? "pl-6 text-ink-2 hover:text-ink" : "border-b-[3px] border-transparent px-3 text-muted-ink",
              active && variant === "sidebar" && "bg-black/[.03] text-ink shadow-[inset_3px_0_0_var(--color-signal)]",
              active && variant === "tabs" && "border-signal text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
