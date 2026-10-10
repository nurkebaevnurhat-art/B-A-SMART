import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AppError } from "@/lib/errors";
import { getDict, pick } from "@/lib/i18n/server";
import { formatDate, formatPrice, storageLabel } from "@/lib/format";
import { getCompatibleAccessories, getUsedUnitByCode, getUsedUnitsOfModel } from "@/server/services/products";
import { getSetting } from "@/server/services/settings";
import { Gallery } from "@/components/product/Gallery";
import { UnitBuyBox } from "@/components/product/UnitBuyBox";
import { Rail } from "@/components/home/Rail";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

const load = cache(async (code: string) => {
  try {
    return await getUsedUnitByCode(code);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = await load((await params).code);
  if (!u) return { title: "Экземпляр не найден" };
  const title = `${u.product.name} б/у ${storageLabel(u.storageGb) ?? ""} ${u.color ?? ""} — ${formatPrice(u.price)}`.replace(/\s+/g, " ");
  return {
    title,
    description: `Б/у ${u.product.name}, экземпляр ${u.code}. Состояние, аккумулятор${u.batteryHealth ? ` ${u.batteryHealth}%` : ""}, отчёт проверки.`,
    alternates: { canonical: `/used/${u.code}` },
  };
}

export default async function UsedUnitPage({ params }: Props) {
  const u = await load((await params).code);
  if (!u) notFound();
  const { locale, t } = await getDict();
  const [inst, grades, others, accessories] = await Promise.all([
    getSetting("installment"),
    getSetting("grades"),
    getUsedUnitsOfModel(u.product.modelKey, u.id),
    getCompatibleAccessories(u.product.modelKey),
  ]);
  const monthly = u.product.installmentAvailable && inst.enabled && u.price >= inst.minPrice && u.price <= inst.maxPrice ? Math.ceil(u.price / Math.max(...inst.terms)) : null;
  const sold = u.status === "SOLD";
  const resultTone = { PASS: "success", FAIL: "danger", NOT_TESTED: "muted" } as const;
  const resultLabel = { PASS: t.used.pass, FAIL: t.used.fail, NOT_TESTED: t.used.notTested };

  const facts: [string, React.ReactNode][] = [
    [t.used.code, <span key="c" className="font-mono">{u.code}</span>],
    [t.used.grade, t.grades[u.grade]],
    [t.used.body, u.bodyCondition],
    [t.used.screen, u.screenCondition],
    [t.used.battery, u.batteryHealth ? `${u.batteryHealth}%` : t.used.notMeasured],
    [t.used.defects, u.defects || t.used.noDefects],
    [t.used.repairs, u.repairs || t.used.noRepairs],
    [t.product.equipment, u.equipment || "—"],
    [t.product.warranty, u.warranty || t.product.noWarranty],
  ];
  if (u.serialMasked) facts.splice(1, 0, ["IMEI / S/N", u.serialMasked]);

  const base = process.env.APP_URL || "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${u.product.name} (б/у)`,
    sku: u.code,
    brand: { "@type": "Brand", name: u.product.brand.name },
    image: u.images.map((i) => (i.url.startsWith("http") ? i.url : `${base}${i.url}`)),
    offers: {
      "@type": "Offer",
      priceCurrency: "KZT",
      price: u.price,
      itemCondition: "https://schema.org/UsedCondition",
      availability: u.available ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };

  return (
    <div className="pb-10">
      <div className="container pt-6 md:pt-8">
        <Breadcrumbs items={[{ label: t.common.home, href: "/" }, { label: t.used.title, href: "/used" }, { label: `${u.product.name} · ${u.code}` }]} />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div className="lg:sticky lg:top-36 lg:self-start">
            <Gallery
              images={u.images.map((i) => ({ url: i.url, alt: i.alt ?? `${u.product.name} ${u.code}` }))}
              name={u.product.name}
              kind={u.product.kind}
              category={u.product.category.slug}
              colorHex={u.colorHex}
              brand={u.product.brand.name}
              illustrationNote={t.used.noPhotos}
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{t.common.badgeUsed}</Badge>
              <Badge tone="outline">{t.grades[u.grade]}</Badge>
              <span className="text-sm text-muted">№ {u.code}</span>
            </div>
            <h1 className="mt-3 font-display text-[28px] font-semibold leading-tight md:text-4xl">{u.product.name}</h1>
            <p className="mt-2 text-graphite">{[storageLabel(u.storageGb), u.color].filter(Boolean).join(" · ")}</p>
            <div className="mt-6">
              <UnitBuyBox unitId={u.id} code={u.code} productSlug={u.product.slug} price={u.price} oldPrice={u.oldPrice} available={u.available} reservedActive={u.reservedActive} sold={sold} monthly={monthly} />
            </div>
            <dl className="mt-8 divide-y divide-line border-y border-line text-[15px]">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[1fr_1.4fr] gap-4 py-3">
                  <dt className="text-graphite">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted">
              {t.used.gradeCriteria} «{t.grades[u.grade]}»: {pick(locale, grades[u.grade].ru, grades[u.grade].kk)}
            </p>
          </div>
        </div>
      </div>

      <section className="container mt-16" aria-labelledby="inspection">
        <div className="rounded-3xl bg-surface p-6 md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="inspection" className="section-title">{t.used.inspection}</h2>
            {u.inspection && <span className="text-sm text-muted">{t.used.inspectedAt}: {formatDate(u.inspection.inspectedAt, locale)}</span>}
          </div>
          {u.checks.length ? (
            <ul className="mt-6 grid gap-x-10 gap-y-1 md:grid-cols-2">
              {u.checks.map((c) => (
                <li key={c.key + c.label} className="flex items-center justify-between gap-4 border-b border-line py-3 text-[15px]">
                  <span>
                    {c.label}
                    {c.note && <span className="block text-sm text-muted">{c.note}</span>}
                  </span>
                  <Badge tone={resultTone[c.result]}>{resultLabel[c.result]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-graphite">{t.used.noReport}</p>
          )}
          {u.inspection?.summary && <p className="mt-6 text-graphite">{u.inspection.summary}</p>}
          <Link href="/info/used-check" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            {t.home.usedCheckTitle} <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </section>

      {u.specs.length > 0 && (
        <section className="container mt-16">
          <h2 className="section-title">{t.product.specs}</h2>
          <dl className="mt-6 grid gap-x-14 md:grid-cols-2">
            {u.specs.flatMap((g) => g.items).map((it) => (
              <div key={it.label} className="grid grid-cols-[1fr_1.3fr] gap-4 border-b border-line py-3 text-[15px]">
                <dt className="text-graphite">{it.label}</dt>
                <dd className="font-medium">{it.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">{t.product.specsNote}</p>
        </section>
      )}

      <Rail title={t.product.accessories} items={accessories} />
      <Rail title={`${u.product.name} — ${t.common.badgeUsed}`} items={others} href="/used" linkLabel={t.common.showAll} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
