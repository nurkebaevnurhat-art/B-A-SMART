import type { Metadata } from "next";
import Link from "next/link";
import { getDict, pick } from "@/lib/i18n/server";
import { parseCatalogQuery } from "@/server/services/catalog";
import { getSetting } from "@/server/services/settings";
import { CatalogView } from "@/components/product/CatalogView";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Б/у смартфоны с отчётом проверки",
  description: "Б/у iPhone и Samsung в Казахстане: фото конкретного экземпляра, состояние, ёмкость аккумулятора и результаты проверки. Халяльная рассрочка.",
  alternates: { canonical: "/used" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UsedPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { locale, t } = await getDict();
  const grades = await getSetting("grades");
  const query = parseCatalogQuery({ ...sp, category: "all", condition: "USED" });
  return (
    <CatalogView
      t={t}
      query={query}
      title={t.used.title}
      lead={t.used.lead}
      basePath="/used"
      searchParams={sp}
      hideCondition
      showGrade
      aside={
        <details className="mt-6 rounded-2xl bg-surface p-5 md:p-6">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
            <Icon name="info" size={20} className="text-accent" /> {t.used.gradeCriteria}
            <Icon name="chevronDown" size={18} className="ml-auto" />
          </summary>
          <dl className="mt-4 grid gap-4 md:grid-cols-3">
            {(["EXCELLENT", "GOOD", "FAIR"] as const).map((g) => (
              <div key={g}>
                <dt className="font-semibold">{t.grades[g]}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-graphite">{pick(locale, grades[g].ru, grades[g].kk)}</dd>
              </div>
            ))}
          </dl>
          <Link href="/info/used-check" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">{t.home.usedCheckTitle} →</Link>
        </details>
      }
    />
  );
}
