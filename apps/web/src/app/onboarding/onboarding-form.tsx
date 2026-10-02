"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { type ApiError, type Business, type CreateBusinessInput, CreateBusinessSchema, slugify } from "@numerito/shared";
import { Ticket } from "@/components/brand/ticket";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Montevideo", label: "Uruguay (Montevideo)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Asuncion", label: "Paraguay (Asunción)" },
  { value: "America/La_Paz", label: "Bolivia (La Paz)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Guayaquil", label: "Ecuador (Guayaquil)" },
  { value: "America/Caracas", label: "Venezuela (Caracas)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
];

const CATEGORIES = [
  { value: "barberia", label: "Barbería" },
  { value: "peluqueria", label: "Peluquería" },
  { value: "otro", label: "Otro" },
] as const;

export function OnboardingForm({ ownerName }: { ownerName: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBusinessInput>({
    resolver: zodResolver(CreateBusinessSchema),
    defaultValues: { name: "", slug: "", timezone: "America/Argentina/Buenos_Aires", category: "barberia" },
  });
  const [name, slug, category] = useWatch({ control, name: ["name", "slug", "category"] });

  const nameField = register("name", {
    onChange: (e) => {
      if (!slugEdited) setValue("slug", slugify(e.target.value), { shouldValidate: false });
    },
  });
  const slugField = register("slug", { onChange: () => setSlugEdited(true) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const res = await fetch("/api/v1/businesses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.status === 409) {
      setError("slug", { message: "Ese link ya está en uso, prueba con otro" });
      return;
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiError | null;
      setFormError(body?.message ?? "No pudimos crear la barbería. Prueba de nuevo.");
      return;
    }
    const business = (await res.json()) as Business;
    router.push(`/panel/${business.id}`);
    router.refresh();
  });

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? "Barbería";

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <div>
        <p className="eyebrow text-muted-ink">Paso 1 de 4</p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.05] uppercase">Tu barbería</h1>
        <p className="mt-2 text-ink-2">Hola, {ownerName}. Empecemos por lo básico; lo demás lo completas desde el panel.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[22px]">
        <Field id="name" label="Nombre del negocio" error={errors.name?.message}>
          <input id="name" className={inputClass} placeholder="Barbería Don Julio" aria-invalid={!!errors.name} {...nameField} />
        </Field>

        <Field
          id="slug"
          label="Link público"
          help="Solo letras, números y guiones. Es el link que vas a poner en Instagram."
          error={errors.slug?.message}
        >
          <div className="flex min-h-12 items-stretch overflow-hidden rounded-[2px] border-[1.5px] border-machine bg-ticket focus-within:border-2 focus-within:border-ink">
            <span className="flex items-center border-r-[1.5px] border-machine bg-paper px-3 font-ticket text-muted-ink">
              numerito.app/b/
            </span>
            <input
              id="slug"
              className="min-w-0 flex-1 bg-transparent px-3 font-ticket font-bold outline-none"
              aria-invalid={!!errors.slug}
              autoCapitalize="none"
              spellCheck={false}
              {...slugField}
            />
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="timezone" label="Zona horaria" error={errors.timezone?.message}>
            <select id="timezone" className={inputClass} {...register("timezone")}>
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="category" label="Tipo de negocio">
            <select id="category" className={inputClass} {...register("category")}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-signal-ink">
            — {formError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-5">
          <Button type="submit" className="min-h-12" disabled={isSubmitting}>
            {isSubmitting ? "Creando…" : "Crear barbería"}
          </Button>
          <Link href="/panel" className={buttonVariants({ variant: "ghost" })}>
            — Ya tengo una
          </Link>
        </div>
      </form>

      <Ticket tear="bottom" className="mt-4 w-[280px] px-5 pt-[18px] pb-[22px] text-sm">
        <b className="block truncate uppercase">{name?.trim() || "Tu barbería"}</b>
        <span className="text-muted-ink">numerito.app/b/</span>
        <b>{slug || "tu-link"}</b>
        <br />
        <span className="text-muted-ink">{categoryLabel}</span>
      </Ticket>
    </div>
  );
}
