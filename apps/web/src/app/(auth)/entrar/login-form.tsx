"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

const LoginSchema = z.object({
  email: z.email("Escribe un email válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});
type LoginValues = z.infer<typeof LoginSchema>;

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await authClient.signIn.email(values);
    if (error) {
      setFormError(error.status === 401 ? "Email o contraseña incorrectos." : "No pudimos iniciar sesión. Prueba de nuevo.");
      return;
    }
    router.push(next);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
      <GoogleButton callbackURL={next} />
      <Field id="email" label="Email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>
      <Field id="password" label="Contraseña" error={errors.password?.message}>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className={`${inputClass} pr-24`}
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 min-w-11 px-3 text-sm font-bold"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </Field>
      {formError && (
        <p role="alert" className="text-sm text-signal-ink">
          — {formError}
        </p>
      )}
      <Button type="submit" className="min-h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center text-sm">
        ¿No tienes cuenta?{" "}
        <Link href={`/registro?next=${encodeURIComponent(next)}`} className="font-bold underline underline-offset-4">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
