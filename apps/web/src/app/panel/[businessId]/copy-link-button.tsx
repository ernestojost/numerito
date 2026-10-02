"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="outline"
        className="min-h-12 w-full"
        onClick={async () => {
          await navigator.clipboard.writeText(url).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Link copiado" : "Copiar mi link"}
      </Button>
      <p className="text-center font-ticket text-[13px] text-muted-ink">{url}</p>
    </div>
  );
}
