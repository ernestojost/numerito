import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function PublicBusinessLayout({ children }: LayoutProps<"/b/[slug]">) {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-5">
        <Link href="/" aria-label="Numerito, inicio">
          <Logo className="text-lg" />
        </Link>
      </header>
      {children}
    </div>
  );
}
