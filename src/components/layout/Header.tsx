"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "../ui/Logo";
import { Icon } from "../ui/Icon";
import { Drawer } from "../ui/Drawer";
import { useShop } from "../ShopProvider";
import { useI18n } from "@/lib/i18n/client";
import { formatPhone } from "@/lib/format";
import { SearchPanel } from "./SearchPanel";
import { AccountPanel } from "./AccountPanel";

export type NavCategory = { slug: string; name: string; group: string };

type MenuItem = { key: string; label: string; href: string; columns?: { title: string; links: { label: string; href: string }[] }[] };

function useMenu(categories: NavCategory[], brands: { slug: string; name: string }[]): MenuItem[] {
  const { t } = useI18n();
  const acc = categories.filter((c) => c.group === "accessories");
  return [
    {
      key: "phones",
      label: t.nav.smartphones,
      href: "/catalog/smartphones",
      columns: [
        {
          title: t.nav.smartphones,
          links: [
            { label: t.nav.allSmartphones, href: "/catalog/smartphones" },
            { label: t.nav.newPhones, href: "/catalog/smartphones?condition=NEW" },
            { label: t.nav.usedPhones, href: "/used" },
            { label: t.nav.refurbished, href: "/catalog/smartphones?condition=REFURBISHED" },
          ],
        },
        { title: t.nav.brands, links: brands.map((b) => ({ label: b.name, href: `/catalog/smartphones?brand=${b.slug}` })) },
        {
          title: t.nav.popular,
          links: [
            { label: "iPhone 17 Pro", href: "/catalog/smartphones?q=iPhone 17 Pro" },
            { label: "iPhone 16", href: "/catalog/smartphones?q=iPhone 16" },
            { label: "Galaxy S25 Ultra", href: "/catalog/smartphones?q=S25 Ultra" },
            { label: t.installment.title, href: "/catalog/smartphones?installment=1" },
          ],
        },
      ],
    },
    { key: "used", label: t.nav.used, href: "/used" },
    {
      key: "devices",
      label: t.nav.tablets,
      href: "/catalog/tablets",
      columns: [
        {
          title: t.nav.tablets,
          links: categories.filter((c) => c.group === "devices" && c.slug !== "smartphones").map((c) => ({ label: c.name, href: `/catalog/${c.slug}` })),
        },
      ],
    },
    {
      key: "acc",
      label: t.nav.accessories,
      href: "/catalog/accessories",
      columns: [
        { title: t.nav.accessories, links: acc.slice(0, Math.ceil(acc.length / 2)).map((c) => ({ label: c.name, href: `/catalog/${c.slug}` })) },
        { title: " ", links: acc.slice(Math.ceil(acc.length / 2)).map((c) => ({ label: c.name, href: `/catalog/${c.slug}` })) },
        { title: t.nav.popular, links: [{ label: t.common.all, href: "/catalog/accessories" }] },
      ],
    },
    { key: "inst", label: t.nav.installment, href: "/installment" },
    { key: "delivery", label: t.nav.delivery, href: "/info/delivery" },
  ];
}

export function Header({
  categories,
  brands,
  phone,
  city,
  cities,
}: {
  categories: NavCategory[];
  brands: { slug: string; name: string }[];
  phone: string;
  city: string;
  cities: string[];
}) {
  const { t, locale } = useI18n();
  const { cartCount, favorites, user, accountOpen, setAccountOpen } = useShop();
  const menu = useMenu(categories, brands);
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setOpen(null);
    setMobile(false);
    setSearch(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enter = (k: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(k);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };

  const setLang = useCallback(
    (l: "ru" | "kk") => {
      document.cookie = `lang=${l};path=/;max-age=31536000;samesite=lax`;
      router.refresh();
    },
    [router],
  );
  const setCity = (c: string) => {
    document.cookie = `city=${encodeURIComponent(c)};path=/;max-age=31536000;samesite=lax`;
    setCityOpen(false);
    router.refresh();
  };

  const current = menu.find((m) => m.key === open && m.columns);
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <header className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md transition-shadow ${scrolled ? "shadow-[0_1px_0_var(--c-line)]" : ""}`} onMouseLeave={leave}>
      <div className="container grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[72px]">
        {/* Левая часть: меню (моб.), город и телефон */}
        <div className="flex items-center gap-1 md:gap-5">
          <button className="-ml-2 rounded-full p-2 hover:bg-surface lg:hidden" onClick={() => setMobile(true)} aria-label={t.common.menu}>
            <Icon name="menu" />
          </button>
          <button onClick={() => setCityOpen(true)} className="hidden items-center gap-1.5 text-sm text-graphite hover:text-ink md:flex" aria-label={t.common.city}>
            <Icon name="pin" size={20} />
            <span>{city}</span>
          </button>
          {phone && (
            <a href={telHref} className="hidden items-center gap-1.5 text-sm text-graphite hover:text-ink xl:flex">
              <Icon name="phone" size={19} />
              <span>{formatPhone(phone)}</span>
            </a>
          )}
        </div>

        <Link href="/" className="justify-self-center" aria-label="B&A SMART — на главную">
          <Logo className="h-[22px] w-auto sm:h-7 md:h-8" />
        </Link>

        {/* Правая часть: поиск, избранное, корзина, кабинет */}
        <div className="flex items-center justify-end gap-0 md:gap-1.5">
          <button onClick={() => setSearch(true)} className="rounded-full p-2 hover:bg-surface sm:p-2.5" aria-label={t.common.search}>
            <Icon name="search" />
          </button>
          <Link href="/favorites" className="relative hidden rounded-full p-2.5 hover:bg-surface sm:block" aria-label={t.common.favorites}>
            <Icon name="heart" />
            {favorites.size > 0 && <Dot n={favorites.size} />}
          </Link>
          <Link href="/cart" className="relative rounded-full p-2 hover:bg-surface sm:p-2.5" aria-label={`${t.common.cart}: ${cartCount}`}>
            <Icon name="bag" />
            {cartCount > 0 && <Dot n={cartCount} />}
          </Link>
          <button onClick={() => setAccountOpen(true)} className="relative rounded-full p-2 hover:bg-surface sm:p-2.5" aria-label={t.common.account}>
            <Icon name="user" />
            {user && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />}
          </button>
        </div>
      </div>

      {/* Горизонтальное меню с выпадающими панелями */}
      <nav className="hidden border-t border-line/70 lg:block" aria-label="Основное меню">
        <ul className="container flex h-12 items-center justify-center gap-9">
          {menu.map((m) => (
            <li key={m.key} onMouseEnter={() => enter(m.key)}>
              <Link
                href={m.href}
                className={`relative py-3 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors hover:text-accent ${
                  m.key === "inst" ? "text-primary" : "text-ink"
                } ${open === m.key ? "text-accent" : ""}`}
                aria-expanded={m.columns ? open === m.key : undefined}
                onFocus={() => enter(m.key)}
              >
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
        {current && (
          <div className="absolute inset-x-0 top-full border-t border-line bg-white shadow-soft animate-fade-up" onMouseEnter={() => enter(current.key)}>
            <div className="container grid grid-cols-4 gap-10 py-10">
              {current.columns!.map((col, i) => (
                <div key={i}>
                  <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{col.title}</div>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="text-[15px] text-ink transition-colors hover:text-accent">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <Link href="/installment" className="group relative overflow-hidden rounded-2xl bg-primary p-6 text-white">
                <div className="eyebrow text-accent">{t.nav.installment}</div>
                <p className="mt-3 text-sm text-white/80">{t.home.installmentText}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                  {t.home.installmentCta} <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Мобильное меню */}
      <Drawer open={mobile} onClose={() => setMobile(false)} side="left" title={<Logo className="h-6 w-auto" />}>
        <nav className="px-6 py-4" aria-label="Мобильное меню">
          <ul className="divide-y divide-line">
            {menu.map((m) => (
              <li key={m.key}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[17px] font-medium">
                    {m.columns ? m.label : <Link href={m.href} className="flex-1">{m.label}</Link>}
                    {m.columns && <Icon name="chevronDown" size={18} className="transition-transform group-open:rotate-180" />}
                  </summary>
                  {m.columns && (
                    <ul className="space-y-3 pb-4 pl-1">
                      {m.columns.flatMap((c) => c.links).map((l) => (
                        <li key={l.href}>
                          <Link href={l.href} className="text-graphite">{l.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </li>
            ))}
            <li className="py-4"><Link href="/favorites" className="text-[17px] font-medium">{t.common.favorites}</Link></li>
          </ul>
          <div className="mt-6 space-y-4 text-sm">
            <button onClick={() => setCityOpen(true)} className="flex items-center gap-2 text-graphite"><Icon name="pin" size={18} /> {city}</button>
            {phone && <a href={telHref} className="flex items-center gap-2 text-graphite"><Icon name="phone" size={18} /> {formatPhone(phone)}</a>}
            <LangSwitch locale={locale} onChange={setLang} />
          </div>
        </nav>
      </Drawer>

      <Drawer open={cityOpen} onClose={() => setCityOpen(false)} side="center" title={t.common.city} width="max-w-md">
        <ul className="grid grid-cols-2 gap-1 p-4">
          {cities.map((c) => (
            <li key={c}>
              <button onClick={() => setCity(c)} className={`w-full rounded-xl px-4 py-3 text-left hover:bg-surface ${c === city ? "font-semibold text-accent" : ""}`}>{c}</button>
            </li>
          ))}
        </ul>
      </Drawer>

      <SearchPanel open={search} onClose={() => setSearch(false)} />
      <AccountPanel open={accountOpen} onClose={() => setAccountOpen(false)} onLang={setLang} />
    </header>
  );
}

function Dot({ n }: { n: number }) {
  return (
    <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-none text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function LangSwitch({ locale, onChange }: { locale: string; onChange: (l: "ru" | "kk") => void }) {
  return (
    <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="Язык / Тіл">
      {(["ru", "kk"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase ${locale === l ? "bg-ink text-white" : "text-graphite"}`}
          aria-pressed={locale === l}
        >
          {l === "ru" ? "Рус" : "Қаз"}
        </button>
      ))}
    </div>
  );
}
