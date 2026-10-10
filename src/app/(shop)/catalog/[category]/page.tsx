import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDict, pick } from "@/lib/i18n/server";
import { CATALOG_GROUPS, parseCatalogQuery } from "@/server/services/catalog";
import { CatalogView } from "@/components/product/CatalogView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function resolve(slug: string, locale: "ru" | "kk") {
  if (slug === "accessories") return { title: CATALOG_GROUPS.accessories[locale], group: "accessories" };
  const c = await db.category.findUnique({ where: { slug } });
  return c ? { title: pick(locale, c.nameRu, c.nameKk), group: c.group } : null;
}

const CONDITION_TITLES: Record<string, string> = { NEW: "Новые смартфоны", REFURBISHED: "Восстановленные смартфоны", USED: "Б/у смартфоны" };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params;
  const sp = await searchParams;
  const c = await resolve(category, "ru");
  if (!c) return {};
  const cond = typeof sp.condition === "string" && category === "smartphones" ? CONDITION_TITLES[sp.condition] : undefined;
  const title = cond ?? c.title;
  return {
    title: `${title} — купить в Казахстане`,
    description: `${title} в интернет-магазине B&A SMART. Цены в тенге, наличие, доставка по Казахстану, халяльная рассрочка.`,
    alternates: { canonical: `/catalog/${category}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const sp = await searchParams;
  const { locale, t } = await getDict();
  const c = await resolve(category, locale);
  if (!c) notFound();
  const query = parseCatalogQuery({ ...sp, category });
  const cond = typeof sp.condition === "string" && category === "smartphones" ? sp.condition : null;
  const title =
    cond === "NEW" ? t.nav.newPhones : cond === "REFURBISHED" ? `${t.nav.refurbished} ${t.nav.smartphones.toLowerCase()}` : cond === "USED" ? t.nav.usedPhones : c.title;
  const isAcc = c.group === "accessories";
  return (
    <CatalogView
      t={t}
      query={query}
      title={title}
      basePath={`/catalog/${category}`}
      searchParams={sp}
      hideCondition={isAcc}
      showCompat={isAcc}
      crumbs={[{ label: t.common.catalog, href: "/catalog" }]}
    />
  );
}
