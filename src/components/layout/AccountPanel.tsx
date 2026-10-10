"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Drawer } from "../ui/Drawer";
import { Icon } from "../ui/Icon";
import { useShop } from "../ShopProvider";
import { useI18n } from "@/lib/i18n/client";
import { api } from "@/lib/client/api";
import { LoginForm } from "../account/LoginForm";
import { LangSwitch } from "./Header";

/** Выезжающая справа панель «Личный кабинет» (как в референсе) */
export function AccountPanel({ open, onClose, onLang }: { open: boolean; onClose: () => void; onLang: (l: "ru" | "kk") => void }) {
  const { t, locale } = useI18n();
  const { user } = useShop();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setBusy(false);
      onClose();
      router.refresh();
    }
  };

  const links = [
    { href: "/account", label: t.account.profile, icon: "user" as const },
    { href: "/account/orders", label: t.account.orders, icon: "box" as const },
    { href: "/favorites", label: t.account.favorites, icon: "heart" as const },
    { href: "/account/installments", label: t.account.installments, icon: "calendar" as const },
    { href: "/account/support", label: t.account.support, icon: "chat" as const },
  ];

  return (
    <Drawer open={open} onClose={onClose} title={t.account.title.toUpperCase()}>
      <div className="flex min-h-full flex-col px-6 py-6">
        {user ? (
          <>
            <p className="text-sm text-muted">{t.account.title}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{user.name}</p>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={onClose} className="flex items-center gap-3 py-4 hover:text-accent">
                    <Icon name={l.icon} size={20} /> {l.label}
                    <Icon name="chevronRight" size={18} className="ml-auto text-muted" />
                  </Link>
                </li>
              ))}
              {user.isStaff && (
                <li>
                  <Link href="/admin" onClick={onClose} className="flex items-center gap-3 py-4 font-medium text-primary hover:text-accent">
                    <Icon name="grid" size={20} /> Админ-панель
                  </Link>
                </li>
              )}
            </ul>
            <button onClick={logout} disabled={busy} className="mt-6 flex items-center gap-2 text-graphite hover:text-danger">
              <Icon name="logout" size={20} /> {t.common.logout}
            </button>
          </>
        ) : (
          <LoginForm compact onSuccess={() => { onClose(); router.refresh(); }} />
        )}
        <div className="mt-auto pt-10">
          <LangSwitch locale={locale} onChange={onLang} />
        </div>
      </div>
    </Drawer>
  );
}
