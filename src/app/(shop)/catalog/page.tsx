import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { parseCatalogQuery } from "@/server/services/catalog";
import { CatalogView } from "@/components/product/CatalogView";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return {
    title: q ? `Поиск: ${q}` : "Каталог смартфонов и аксессуаров",
    description: "Каталог B&A SMART: новые и б/у смартфоны, планшеты, смарт-часы и аксессуары с ценами в тенге.",
    alternates: { canonical: "/catalog" },
    robots: q ? { index: false } : undefined,
  };
}

export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { t } = await getDict();
  const query = parseCatalogQuery({ ...sp, category: "all" });
  return <CatalogView t={t} query={query} title={t.common.catalog} basePath="/catalog" searchParams={sp} showCompat />;
}
