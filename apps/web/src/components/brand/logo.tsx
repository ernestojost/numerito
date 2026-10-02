import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[28px] leading-none tracking-[.04em] uppercase", className)}>
      Numerito<span className="text-signal">.</span>
    </span>
  );
}
