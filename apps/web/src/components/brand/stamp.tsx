import type { BookingStatus } from "@numerito/shared";
import { cn } from "@/lib/utils";

export type StampKind = BookingStatus | "slot_taken" | "payment_rejected";

const STAMPS: Record<StampKind, { text: string; className: string }> = {
  pending_payment: { text: "Retenido", className: "text-ink border-dashed" },
  confirmed: { text: "Confirmado", className: "text-ok" },
  completed: { text: "Atendido", className: "text-ink" },
  cancelled_by_client: { text: "Cancelado", className: "text-signal" },
  cancelled_by_business: { text: "Cancelado", className: "text-signal" },
  no_show: { text: "No vino", className: "text-signal" },
  expired: { text: "Vencido", className: "text-muted-ink" },
  slot_taken: { text: "409 · Ya tomado", className: "text-signal" },
  payment_rejected: { text: "Pago rechazado", className: "text-signal" },
};

/** Rubber stamp that marks a booking's state on its ticket. */
export function Stamp({ kind, children, className }: { kind: StampKind; children?: React.ReactNode; className?: string }) {
  const stamp = STAMPS[kind];
  return <span className={cn("stamp", stamp.className, className)}>{children ?? stamp.text}</span>;
}
