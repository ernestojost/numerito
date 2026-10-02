"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Right-hand editing panel (full screen on phones). Closes with Escape or the close button;
 * focus moves into it on open and back to the page on close.
 */
export function SidePanel({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Callers pass an inline onClose; keep the latest one without re-running the open effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // The first field of the form, not the close button.
    const content = ref.current?.querySelector("[data-panel-content]");
    (content?.querySelector<HTMLElement>("input, select, textarea") ?? ref.current?.querySelector<HTMLElement>("button"))?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-panel-title"
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-machine bg-paper shadow-[-12px_0_32px_rgba(0,0,0,.14)] sm:w-[440px]"
      >
        <div className="flex items-center justify-between border-b border-machine px-6 py-4">
          <h2 id="side-panel-title" className="font-display text-2xl uppercase">
            {title}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div data-panel-content className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && <div className="border-t border-machine px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
