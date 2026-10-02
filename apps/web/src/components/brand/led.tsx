import { cn } from "@/lib/utils";

interface LedProps {
  /** Small grey caption on the left, e.g. "Ahora atendiendo". Use `\n` for two lines. */
  label?: string;
  children: React.ReactNode;
  off?: boolean;
  className?: string;
  valueClassName?: string;
}

/** Black dot-matrix display used for "what is happening now": current turn, hold countdown. */
export function Led({ label, children, off, className, valueClassName }: LedProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg bg-led px-[18px] py-3 shadow-[inset_0_0_0_3px_var(--color-led-frame)]",
        className,
      )}
    >
      {label && (
        <span className="text-[11px] leading-[1.3] font-bold tracking-[.16em] whitespace-pre-line text-led-off uppercase">
          {label}
        </span>
      )}
      <span
        className={cn(
          "font-led leading-none font-bold whitespace-nowrap",
          off ? "text-led-off" : "led-glow",
          valueClassName ?? "text-[28px]",
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function LedChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "led-glow inline-flex items-center rounded bg-led px-2 py-[3px] font-led text-sm leading-tight font-bold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}
