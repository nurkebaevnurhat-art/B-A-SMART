import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";
import { brand, brandCssVariables } from "@/config/brand";
import { getDict } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/ServiceWorker";

const sans = Inter({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-sans", display: "swap" });
const display = Unbounded({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-display", display: "swap", weight: ["400", "500", "600", "700"] });

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${brand.name} — смартфоны и аксессуары в Казахстане`, template: `%s — ${brand.name}` },
  description: "Новые и проверенные б/у смартфоны, планшеты, смарт-часы и аксессуары. Халяльная рассрочка без процентов. Доставка по Казахстану.",
  applicationName: brand.name,
  openGraph: { type: "website", siteName: brand.name, locale: "ru_KZ" },
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: brand.colors.primary,
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDict();
  return (
    <html lang={locale === "kk" ? "kk" : "ru"} className={`${sans.variable} ${display.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCssVariables() }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          К содержимому
        </a>
        <I18nProvider locale={locale} t={t}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
