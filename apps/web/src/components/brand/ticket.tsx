import { cn } from "@/lib/utils";

type Tear = "both" | "bottom" | "top" | "none";

const TEAR: Record<Tear, string> = { both: "tear", bottom: "tear-b", top: "tear-t", none: "" };

/** Thermal-paper ticket. Every booking in Numerito is drawn as one. */
export function Ticket({
  tear = "both",
  as: Tag = "div",
  className,
  children,
}: {
  tear?: Tear;
  as?: "div" | "article" | "section" | "li";
  className?: string;
  children: React.ReactNode;
}) {
  return <Tag className={cn("ticket", TEAR[tear], className)}>{children}</Tag>;
}

export function TicketRule() {
  return <div className="my-2.5 border-t-[1.5px] border-dashed border-machine" />;
}

export function Barcode({ value, className }: { value: string; className?: string }) {
  return (
    <span aria-hidden className={cn("block font-barcode text-[44px] leading-none", className)}>
      {value}
    </span>
  );
}
