"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

export function AccountNav() {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: "/account", label: t.account.profile },
    { href: "/account/orders", label: t.account.orders },
    { href: "/favorites", label: t.account.favorites },
    { href: "/account/installments", label: t.account.installments },
    { href: "/account/support", label: t.account.support },
  ];
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:flex-col lg:gap-1 lg:px-0" aria-label={t.account.title}>
      {items.map((i) => {
        const active = i.href === "/account" ? path === "/account" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-full px-4 py-2.5 text-[15px] lg:rounded-xl ${active ? "bg-ink text-white" : "hover:bg-surface"}`}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
