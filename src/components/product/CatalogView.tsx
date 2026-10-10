import Link from "next/link";
import { Suspense } from "react";
import { catalogFacets, listCatalog, type CatalogQuery } from "@/server/services/catalog";
import type { Dict } from "@/lib/i18n/dict";
import { plural } from "@/lib/format";
import { ProductGrid } from "./ProductCard";
import { CatalogFilters, SortSelect } from "./CatalogFilters";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { Icon } from "../ui/Icon";

export async function CatalogView({
  t,
  query,
  title,
  lead,
  basePath,
  searchParams,
  hideCondition,
  showGrade,
  showCompat,
  crumbs = [],
  aside,
}: {
  t: Dict;
  query: CatalogQuery;
  title: string;
  lead?: string;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  hideCondition?: boolean;
  showGrade?: boolean;
  showCompat?: boolean;
  crumbs?: { label: string; href?: string }[];
  aside?: React.ReactNode;
}) {
  const [result, facets] = await Promise.all([listCatalog(query), catalogFacets(query)]);
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    return `${basePath}${sp.size ? `?${sp}` : ""}`;
  };
  return (
    <div className="container pb-20 pt-6 md:pt-8">
      <Breadcrumbs items={[{ label: t.common.home, href: "/" }, ...crumbs, { label: title }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-[42px]">{query.q ? `«${query.q}»` : title}</h1>
          {lead && <p className="mt-3 max-w-2xl text-graphite">{lead}</p>}
          <p className="mt-2 text-sm text-muted" aria-live="polite">
            {t.catalog.found}: {result.total} {plural(result.total, ["товар", "товара", "товаров"])}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <CatalogFilters mode="button" facets={facets} total={result.total} hideCondition={hideCondition} showGrade={showGrade} showCompat={showCompat} />
            <SortSelect />
          </Suspense>
        </div>
      </div>
      {aside}
      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <div className="hidden lg:block">
          <Suspense>
            <CatalogFilters mode="sidebar" facets={facets} total={result.total} hideCondition={hideCondition} showGrade={showGrade} showCompat={showCompat} />
          </Suspense>
        </div>
        <div>
          {result.items.length ? (
            <ProductGrid items={result.items} priorityFirst={4} />
          ) : (
            <div className="rounded-3xl bg-surface px-6 py-16 text-center">
              <Icon name="search" size={36} className="mx-auto text-muted" />
              <h2 className="mt-4 font-sans text-xl font-semibold">{t.catalog.nothingFound}</h2>
              <p className="mt-2 text-graphite">{t.catalog.nothingFoundText}</p>
              <Link href={basePath} className="mt-6 inline-block font-medium text-accent hover:underline">{t.catalog.reset}</Link>
            </div>
          )}
          {result.pages > 1 && (
            <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Страницы">
              {result.page > 1 && <Link href={pageHref(result.page - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-ink" aria-label={t.catalog.prev}><Icon name="chevronLeft" size={18} /></Link>}
              {Array.from({ length: result.pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === result.pages || Math.abs(p - result.page) <= 2)
                .map((p, i, arr) => (
                  <span key={p} className="flex items-center gap-2">
                    {i > 0 && p - arr[i - 1] > 1 && <span className="text-muted">…</span>}
                    <Link href={pageHref(p)} aria-current={p === result.page ? "page" : undefined} className={`grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm ${p === result.page ? "bg-ink text-white" : "border border-line hover:border-ink"}`}>{p}</Link>
                  </span>
                ))}
              {result.page < result.pages && <Link href={pageHref(result.page + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-ink" aria-label={t.catalog.next}><Icon name="chevronRight" size={18} /></Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
