import { CalendarCheck, CreditCard, BellRing } from "lucide-react";
import { ApiStatus } from "@/components/api-status";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Agenda sin superposiciones",
    body: "Tus clientes ven solo los horarios realmente libres. Dos personas nunca pueden reservar el mismo turno.",
  },
  {
    icon: CreditCard,
    title: "Seña con Mercado Pago",
    body: "Cobrá una seña al reservar y reducí las ausencias. El turno se confirma solo cuando se acredita el pago.",
  },
  {
    icon: BellRing,
    title: "Recordatorios automáticos",
    body: "Confirmación inmediata y recordatorio 24 horas antes por email o WhatsApp.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-16 sm:px-6 sm:py-24">
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground">Turnia</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Turnos online para tu negocio, sin llamadas ni planillas.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground text-pretty">
          Peluquerías, consultorios y estudios reciben reservas las 24 horas, cobran seña y
          mandan recordatorios automáticos.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled>Crear mi negocio</Button>
          <Button size="lg" variant="outline" disabled>Ver demo</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">En construcción — registro disponible próximamente.</p>
      </section>

      <section className="mt-20 grid gap-8 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <Icon className="size-5 text-foreground" aria-hidden />
            <h2 className="mt-3 font-medium">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto pt-20">
        <ApiStatus />
      </footer>
    </main>
  );
}
