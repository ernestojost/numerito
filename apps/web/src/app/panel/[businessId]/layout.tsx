import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getMyBusinesses, getSession } from "@/lib/server-api";
import { SignOutButton } from "./sign-out-button";

const NAV = [
  { href: "", label: "Agenda", ready: true },
  { href: "/clientes", label: "Clientes" },
  { href: "/servicios", label: "Servicios" },
  { href: "/barberos", label: "Barberos" },
  { href: "/horarios", label: "Horarios" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/configuracion", label: "Configuración" },
];

export default async function PanelLayout({ children, params }: LayoutProps<"/panel/[businessId]">) {
  const { businessId } = await params;
  const [session, businesses] = await Promise.all([getSession(), getMyBusinesses()]);
  if (!session) redirect(`/entrar?next=/panel/${businessId}`);

  const business = businesses.find((b) => b.id === businessId);
  if (!business) notFound();

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex items-center justify-between border-b border-machine px-5 py-3 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:flex-col lg:items-stretch lg:justify-start lg:border-r lg:border-b-0 lg:px-0 lg:py-6">
        <Link href="/" className="lg:px-6" aria-label="Numerito, inicio">
          <Logo className="text-2xl" />
        </Link>
        <nav aria-label="Panel" className="mt-5 hidden flex-col lg:flex">
          {NAV.map((item) =>
            item.ready ? (
              <Link
                key={item.label}
                href={`/panel/${business.id}${item.href}`}
                aria-current="page"
                className="eyebrow flex min-h-11 items-center bg-black/[.03] pl-6 shadow-[inset_3px_0_0_var(--color-signal)]"
              >
                {item.label}
              </Link>
            ) : (
              <span key={item.label} className="eyebrow flex min-h-11 items-center pl-6 text-muted-ink" title="Próximamente">
                {item.label}
              </span>
            ),
          )}
        </nav>
        <div className="flex items-center gap-3 lg:mt-auto lg:border-t lg:border-machine lg:px-6 lg:pt-4">
          <span className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper lg:inline-flex">
            {initials(business.name)}
          </span>
          <span className="hidden min-w-0 lg:block">
            <b className="block truncate text-sm">{business.name}</b>
            <span className="block truncate text-[13px] text-muted-ink">numerito.app/b/{business.slug}</span>
          </span>
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
