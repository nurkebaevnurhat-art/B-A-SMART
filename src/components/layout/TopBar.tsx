import Link from "next/link";
import type { Locale } from "@/lib/i18n/dict";

export type TopBarItem = { text: string; href?: string };

/** Информационная полоса: только условия из админ-панели (настройки и способы доставки). */
export function TopBar({ items }: { items: TopBarItem[]; locale: Locale }) {
  if (!items.length) return null;
  return (
    <div className="bg-primary-dark text-[13px] text-white/85">
      <div className="container flex h-9 items-center justify-center gap-8 overflow-x-auto whitespace-nowrap scrollbar-none md:justify-between">
        {items.slice(0, 4).map((it, i) =>
          it.href ? (
            <Link key={i} href={it.href} className={`hover:text-white ${i > 0 ? "hidden md:inline" : ""}`}>
              {it.text}
            </Link>
          ) : (
            <span key={i} className={i > 0 ? "hidden md:inline" : ""}>{it.text}</span>
          ),
        )}
      </div>
    </div>
  );
}
