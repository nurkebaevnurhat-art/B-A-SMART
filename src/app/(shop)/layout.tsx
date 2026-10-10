import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TopBar } from "@/components/layout/TopBar";
import { ShopProvider } from "@/components/ShopProvider";
import { getDict } from "@/lib/i18n/server";
import { getSessionShell, getShell } from "@/server/layout-data";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDict();
  const [shell, session] = await Promise.all([getShell(locale), getSessionShell()]);
  return (
    <ShopProvider user={session.user} initialCartCount={session.cartCount} initialFavorites={session.favorites}>
      <TopBar items={shell.topbarItems} locale={locale} />
      <Header
        categories={shell.categories}
        brands={shell.brands}
        phone={shell.store.phone}
        city={shell.city}
        cities={shell.store.cities}
      />
      <main id="main" className="min-h-[60vh]">{children}</main>
      {process.env.NEXT_PUBLIC_DEMO_MODE !== "false" && (
        <div className="border-t border-line bg-surface py-3 text-center text-xs text-muted">{t.common.demoNotice}</div>
      )}
      <Footer t={t} store={shell.store} categories={shell.categories.filter((c) => c.group === "devices")} />
    </ShopProvider>
  );
}
