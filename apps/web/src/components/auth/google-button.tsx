"use client";

import { useState } from "react";
import { authClient, googleEnabled } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function GoogleButton({ callbackURL }: { callbackURL: string }) {
  const [pending, setPending] = useState(false);
  if (!googleEnabled) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-12 w-full"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await authClient.signIn.social({ provider: "google", callbackURL });
          setPending(false);
        }}
      >
        <span aria-hidden className="inline-flex size-6 items-center justify-center rounded-[2px] border-[1.5px] border-current text-[13px]">
          G
        </span>
        Continuar con Google
      </Button>
      <p className="text-center text-[13px] text-muted-ink">— o con tu email —</p>
    </>
  );
}
