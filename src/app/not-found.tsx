import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NotFoundView } from "@/components/NotFoundView";

export default function NotFound() {
  return (
    <>
      <header className="border-b border-line">
        <div className="container flex h-16 items-center justify-center"><Link href="/" aria-label="На главную"><Logo className="h-7 w-auto" /></Link></div>
      </header>
      <main id="main"><NotFoundView /></main>
    </>
  );
}
