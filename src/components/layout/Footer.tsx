import Link from "next/link";
import { Logo } from "../ui/Logo";
import type { Dict } from "@/lib/i18n/dict";
import { formatPhone } from "@/lib/format";
import type { SettingsMap } from "@/server/services/settings";

export function Footer({ t, store, categories }: { t: Dict; store: SettingsMap["store"]; categories: { slug: string; name: string }[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 bg-ink text-white/75">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo onDark className="h-8 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Новые и б/у смартфоны, аксессуары и халяльная рассрочка. {store.city}.
          </p>
          {store.instagram && (
            <a href={store.instagram} className="mt-4 inline-block text-sm text-white hover:text-accent" target="_blank" rel="noopener noreferrer">Instagram</a>
          )}
        </div>
        <FooterCol title={t.common.catalog}>
          <FooterLink href="/catalog/smartphones?condition=NEW">{t.nav.newPhones}</FooterLink>
          <FooterLink href="/used">{t.nav.usedPhones}</FooterLink>
          <FooterLink href="/catalog/smartphones?condition=REFURBISHED">{t.nav.refurbished}</FooterLink>
          {categories.slice(0, 4).map((c) => (
            <FooterLink key={c.slug} href={`/catalog/${c.slug}`}>{c.name}</FooterLink>
          ))}
        </FooterCol>
        <FooterCol title={t.footer.buyers}>
          <FooterLink href="/installment">{t.nav.installment}</FooterLink>
          <FooterLink href="/info/delivery">{t.nav.delivery}</FooterLink>
          <FooterLink href="/info/used-check">{t.footer.usedCheck}</FooterLink>
          <FooterLink href="/info/returns">{t.footer.returns}</FooterLink>
          <FooterLink href="/info/terms">{t.footer.terms}</FooterLink>
          <FooterLink href="/info/privacy">{t.footer.privacy}</FooterLink>
        </FooterCol>
        <FooterCol title={t.footer.contacts}>
          {store.phone && <li><a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`} className="text-lg font-medium text-white hover:text-accent">{formatPhone(store.phone)}</a></li>}
          {store.email && <li><a href={`mailto:${store.email}`} className="hover:text-white">{store.email}</a></li>}
          {store.address && <li>{store.city}, {store.address}</li>}
          {store.workHours && <li>{store.workHours}</li>}
          <FooterLink href="/info/contacts">{t.footer.contacts}</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-2 py-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <span>© {year} {store.legalName || store.name}. {t.footer.rights}{store.bin ? ` БИН ${store.bin}` : ""}</span>
          <Link href="/api-docs" className="hover:text-white">{t.footer.apiDocs}</Link>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-white">{title}</div>
      <ul className="space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="transition-colors hover:text-white">{children}</Link>
    </li>
  );
}
