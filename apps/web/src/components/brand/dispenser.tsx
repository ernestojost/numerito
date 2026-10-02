import { cn } from "@/lib/utils";

/** The grey "tome su número" machine tickets come out of. */
export function Dispenser({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-[18px_18px_8px_8px] bg-linear-to-b from-[#cfcdc6] to-machine shadow-[inset_0_-8px_0_rgba(0,0,0,.08),0_12px_24px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      {children}
      <span aria-hidden className="absolute inset-x-[10%] -bottom-1 h-2 rounded bg-[#5c5a55]" />
    </div>
  );
}
