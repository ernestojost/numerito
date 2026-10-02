import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1296px] items-center justify-between px-2 lg:px-0">
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          ← Volver
        </Link>
        <Link href="/" aria-label="Numerito, inicio">
          <Logo className="text-xl" />
        </Link>
        <span className="w-[88px]" aria-hidden />
      </header>
      <main className="mx-auto w-full max-w-[420px] flex-1 px-5 pt-2 pb-16">{children}</main>
    </div>
  );
}
