"use client";

import { useEffect, useState } from "react";
import { HealthResponseSchema } from "@turnia/shared";

type Status = "loading" | "ok" | "degraded" | "down";

const LABELS: Record<Status, string> = {
  loading: "Verificando API…",
  ok: "API y base de datos operativas",
  degraded: "API activa, base de datos sin conexión",
  down: "API sin conexión",
};

const DOT: Record<Status, string> = {
  loading: "bg-muted-foreground animate-pulse",
  ok: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
};

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        const health = HealthResponseSchema.parse(json);
        setStatus(health.db === "ok" ? "ok" : "degraded");
      })
      .catch(() => setStatus("down"));
  }, []);

  return (
    <p role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`size-2 rounded-full ${DOT[status]}`} aria-hidden />
      {LABELS[status]}
    </p>
  );
}
