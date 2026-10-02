import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getSession } from "@/lib/server-api";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Crea tu barbería · Numerito" };

const STEPS = ["Tu barbería", "Servicios", "Barberos", "Horario"];

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/entrar?next=/onboarding");

  return (
    <div className="grid flex-1 lg:grid-cols-[480px_1fr]">
      <aside className="flex flex-col gap-8 bg-ink px-5 py-6 text-paper lg:px-14 lg:py-12">
        <Link href="/" aria-label="Numerito, inicio">
          <Logo className="text-2xl" />
        </Link>
        <div className="hidden flex-col gap-8 lg:flex">
          <h2 className="font-display text-2xl tracking-[.08em] uppercase">Crea tu barbería</h2>
          <ol className="flex flex-col gap-[18px]">
            {STEPS.map((step, i) => (
              <li key={step} className={i === 0 ? "flex items-center gap-4" : "flex items-center gap-4 text-machine"}>
                <span
                  className={
                    i === 0
                      ? "led-glow rounded bg-led px-2 py-[3px] font-led text-lg font-bold"
                      : "w-[38px] text-center font-led text-lg font-bold"
                  }
                >
                  0{i + 1}
                </span>
                {i === 0 ? <b className="text-[17px]">{step}</b> : step}
              </li>
            ))}
          </ol>
        </div>
      </aside>
      <main className="px-5 py-8 lg:px-[120px] lg:py-[72px]">
        <OnboardingForm ownerName={session.user.name} />
      </main>
    </div>
  );
}
