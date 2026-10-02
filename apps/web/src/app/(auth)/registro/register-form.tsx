"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { GoogleButton } from "@/components/auth/google-button";
import { Ticket } from "@/components/brand/ticket";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre"),
  email: z.email("Escribe un email válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  terms: z.literal(true, { error: "Tienes que aceptar los términos" }),
});
type RegisterValues = z.input<typeof RegisterSchema>;

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(RegisterSchema) });
  const name = useWatch({ control, name: "name" });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setFormError(null);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setFormError(
        error.code === "USER_ALREADY_EXISTS" || error.status === 422
          ? "Ya hay una cuenta con ese email. Prueba entrar."
          : "No pudimos crear la cuenta. Prueba de nuevo.",
      );
      return;
    }
    router.push(next);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <h1 className="flex-1 font-display text-[40px] leading-[1.05] uppercase">Crear cuenta</h1>
        <Ticket tear="bottom" className="w-[132px] rotate-3 px-3 pt-2.5 pb-3.5 text-xs" as="div">
          A nombre de:
          <b className="block truncate text-[15px]">{name?.trim() || "…"}</b>
        </Ticket>
      </div>
      <GoogleButton callbackURL={next} />
      <Field id="name" label="Nombre" error={errors.name?.message}>
        <input id="name" autoComplete="name" className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field id="email" label="Email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={inputClass}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>
      <Field id="password" label="Contraseña" help="Mínimo 8 caracteres." error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input type="checkbox" className="size-5 accent-ink" {...register("terms")} />
          Acepto los términos y la política de privacidad
        </label>
        {errors.terms && (
          <p role="alert" className="text-sm text-signal-ink">
            — {errors.terms.message}
          </p>
        )}
      </div>
      {formError && (
        <p role="alert" className="text-sm text-signal-ink">
          — {formError}
        </p>
      )}
      <Button type="submit" className="min-h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
      <p className="text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="font-bold underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
