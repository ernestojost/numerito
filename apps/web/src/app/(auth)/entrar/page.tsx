import type { Metadata } from "next";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Numerito" };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const next = safeNext((await searchParams).next);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[40px] leading-[1.05] uppercase">Entrar</h1>
      <LoginForm next={next} />
    </div>
  );
}
