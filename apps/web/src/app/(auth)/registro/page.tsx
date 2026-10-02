import type { Metadata } from "next";
import { safeNext } from "@/lib/safe-next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta · Numerito" };

export default async function RegisterPage({ searchParams }: PageProps<"/registro">) {
  // New owners land on onboarding to create their business.
  const next = safeNext((await searchParams).next, "/onboarding");
  return <RegisterForm next={next} />;
}
