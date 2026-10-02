import { cn } from "@/lib/utils";

/** Label + control + help/error text, with the ids wired for screen readers. */
export function Field({
  id,
  label,
  help,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-signal-ink">
          — {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="text-sm text-muted-ink">
            {help}
          </p>
        )
      )}
    </div>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-[2px] border-[1.5px] border-machine bg-ticket px-3.5 text-base text-ink placeholder:text-muted-ink outline-none focus:border-2 focus:border-ink aria-invalid:border-2 aria-invalid:border-signal-ink disabled:opacity-60";
