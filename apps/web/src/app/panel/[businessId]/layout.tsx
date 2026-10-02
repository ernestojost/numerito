import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getBusiness, getSession } from "@/lib/server-api";
import { PanelNav } from "./panel-nav";
import { SignOutButton } from "./sign-out-button";

export default async function PanelLayout({ children, params }: LayoutProps<"/panel/[businessId]">) {
  const { businessId } = await params;
  const [session, business] = await Promise.all([getSession(), getBusiness(businessId)]);
  if (!session) redirect(`/entrar?next=/panel/${businessId}`);
  if (!business) notFound();

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="border-b border-machine lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:py-6">
        <div className="flex items-center justify-between px-5 py-3 lg:block lg:px-6 lg:py-0">
          <Link href="/" aria-label="Numerito, inicio">
            <Logo className="text-2xl" />
          </Link>
          <span className="lg:hidden">
            <SignOutButton />
          </span>
        </div>
        <PanelNav businessId={business.id} variant="sidebar" />
        <PanelNav businessId={business.id} variant="tabs" />
        <div className="hidden items-center gap-3 border-t border-machine px-6 pt-4 lg:mt-auto lg:flex">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">
            {initials(business.name)}
          </span>
          <span className="min-w-0">
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
