"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "../ui/Logo";
import { Icon } from "../ui/Icon";

export type NavItem = { href: string; label: string; group: string };

export function AdminNav({ items, user }: { items: NavItem[]; user: { name: string; role: string } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const groups = [...new Set(items.map((i) => i.group))];
  const nav = (
    <nav className="space-y-6 text-sm" aria-label="Админ-меню">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{g}</div>
          <ul className="space-y-0.5">
            {items.filter((i) => i.group === g).map((i) => {
              const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
              return (
                <li key={i.href}>
                  <Link href={i.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`block rounded-lg px-3 py-2 ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                    {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-ink px-4 text-white lg:hidden">
        <button onClick={() => setOpen(!open)} aria-label="Меню" className="p-1"><Icon name={open ? "close" : "menu"} /></button>
        <Logo onDark className="h-5 w-auto" />
        <Link href="/" className="text-xs text-white/70">Сайт</Link>
      </div>
      <aside className={`${open ? "block" : "hidden"} fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-ink p-4 text-white lg:sticky lg:top-0 lg:block lg:h-screen`}>
        <div className="mb-8 hidden items-center justify-between px-3 pt-2 lg:flex">
          <Logo onDark className="h-6 w-auto" />
        </div>
        {nav}
        <div className="mt-8 border-t border-white/10 px-3 pt-4 text-xs text-white/50">
          <div className="text-sm text-white">{user.name}</div>
          <div>{user.role}</div>
          <Link href="/" className="mt-3 inline-block text-white/70 hover:text-white">← На сайт</Link>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
