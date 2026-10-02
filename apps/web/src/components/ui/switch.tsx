"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name; shown next to the switch unless it is "sr-only" via className on the label. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50",
        checked ? "bg-ink" : "bg-machine",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("absolute size-5 rounded-full bg-white transition-[left]", checked ? "left-[22px]" : "left-0.5")}
      />
    </button>
  );
}
