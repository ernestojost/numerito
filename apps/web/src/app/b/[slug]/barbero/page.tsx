import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Stepper } from "@/components/booking/stepper";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPublicBusiness } from "../data";

export const metadata: Metadata = { title: "Elige barbero · Numerito" };

const ANY = "cualquiera";

export default async function ChooseBarberPage({ params, searchParams }: PageProps<"/b/[slug]/barbero">) {
  const { slug } = await params;
  const query = await searchParams;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();

  const service = business.services.find((s) => s.id === query.servicio);
  if (!service) redirect(`/b/${slug}`);

  const selected = typeof query.barbero === "string" ? query.barbero : ANY;
  const canDo = new Set(service.staffIds);
  const href = (barbero: string) => `/b/${slug}/barbero?servicio=${service.id}&barbero=${barbero}`;

  return (
    <main className="flex flex-1 flex-col px-5 pb-28">
      <Link href={`/b/${slug}`} className={buttonVariants({ variant: "ghost", className: "-ml-1 self-start" })}>
        ← {service.name} · {service.durationMinutes} min
      </Link>
      <div className="mt-2 flex flex-col gap-3.5">
        <Stepper current={2} />
        <h2 className="font-display text-[32px] leading-[1.05] uppercase">¿Con quién?</h2>

        <ul className="flex flex-col gap-3" role="list">
          <li>
            <Option
              href={href(ANY)}
              selected={selected === ANY}
              avatar="✱"
              title="Cualquier barbero"
              subtitle="El primero libre. Más horarios para elegir."
            />
          </li>
          {business.staff.map((member) =>
            canDo.has(member.id) ? (
              <li key={member.id}>
                <Option
                  href={href(member.id)}
                  selected={selected === member.id}
                  avatar={member.displayName.slice(0, 2).toUpperCase()}
                  title={member.displayName}
                  subtitle={`Hace: ${member.serviceIds
                    .map((id) => business.services.find((s) => s.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}`}
                />
              </li>
            ) : (
              <li key={member.id}>
                <div aria-disabled="true" className="ticket tear flex min-h-[76px] items-center gap-3.5 px-[18px] opacity-60">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-machine font-sans text-sm font-bold text-paper">
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <b className="text-base">{member.displayName}</b>
                    <br />
                    <span className="text-[13px] text-muted-ink">No hace este servicio</span>
                  </span>
                </div>
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-machine bg-paper px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[440px]">
          <Link
            href={`/b/${slug}/horario?servicio=${service.id}&barbero=${selected}`}
            className={buttonVariants({ className: "min-h-12 w-full" })}
          >
            Elegir horario
          </Link>
        </div>
      </div>
    </main>
  );
}

function Option({
  href,
  selected,
  avatar,
  title,
  subtitle,
}: {
  href: string;
  selected: boolean;
  avatar: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "ticket tear flex min-h-[76px] items-center gap-3.5 px-[18px] outline-none focus-visible:ring-2 focus-visible:ring-ink",
        selected && "bg-ink bg-none text-paper",
      )}
    >
      <span
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-full font-sans text-sm font-bold",
          selected ? "bg-paper text-ink" : "bg-ink text-paper",
        )}
      >
        {avatar}
      </span>
      <span>
        <b className="text-base">{title}</b>
        <br />
        <span className={cn("text-[13px]", selected ? "text-machine" : "text-muted-ink")}>{subtitle}</span>
      </span>
    </Link>
  );
}
