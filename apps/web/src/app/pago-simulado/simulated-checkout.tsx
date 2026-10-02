"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SimulatedCheckout({ bookingId, amountCents }: { bookingId: string; amountCents: number }) {
  const router = useRouter();
  // Same shape as the real return from Mercado Pago: the ticket page reads payment_id and confirms it with the API.
  const finish = (outcome: "approved" | "rejected") =>
    router.replace(`/mis-turnos/${bookingId}?payment_id=sim_${bookingId}_${outcome}_${amountCents}`);

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" className="w-full" onClick={() => finish("approved")}>
        Simular pago aprobado
      </Button>
      <Button size="lg" variant="outline" className="w-full" onClick={() => finish("rejected")}>
        Simular pago rechazado
      </Button>
    </div>
  );
}
