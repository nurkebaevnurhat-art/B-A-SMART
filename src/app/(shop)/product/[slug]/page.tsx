import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getDict, pick } from "@/lib/i18n/server";
import { formatDate, formatPrice } from "@/lib/format";
import {
  getCompatibleAccessories,
  getCompatibleModels,
  getProductBySlug,
  getSimilarProducts,
  getUsedUnitsOfModel,
} from "@/server/services/products";
import { getSetting } from "@/server/services/settings";
import { ProductMain } from "@/components/product/ProductMain";
import { ReviewForm } from "@/components/product/ReviewForm";
import { Rail } from "@/components/home/Rail";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const load = cache(async (slug: string) => {
  try {
    return await getProductBySlug(slug);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Товар не найден" };
  const min = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;
  const description = p.seoDescription || `${p.name}${min ? ` от ${formatPrice(min)}` : ""}. ${p.description}`.slice(0, 160);
  return {
    title: p.seoTitle || `${p.name} — купить в Казахстане`,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description, images: p.images[0] ? [{ url: p.images[0].url }] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  // Для модели «б/у» отдельной покупки нет — переводим в раздел экземпляров
  const { locale, t } = await getDict();
  const [inst, delivery] = await Promise.all([getSetting("installment"), db.deliveryOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })]);
  const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : 0;
  const isDevice = ["SMARTPHONE", "TABLET", "WATCH"].includes(p.kind);
  const [accessories, similar, usedUnits, compatModels] = await Promise.all([
    isDevice ? getCompatibleAccessories(p.modelKey) : Promise.resolve([]),
    getSimilarProducts(p, minPrice || 100000),
    isDevice ? getUsedUnitsOfModel(p.modelKey) : Promise.resolve([]),
    !isDevice ? getCompatibleModels(p.compatibleWith.map((c) => c.modelKey)) : Promise.resolve([]),
  ]);

  const description = pick(locale, p.description, p.descriptionKk);
  const rating = p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : null;
  const base = process.env.APP_URL || "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    brand: { "@type": "Brand", name: p.brand.name },
    model: p.model,
    description: p.description,
    sku: p.variants[0]?.sku,
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${base}${i.url}`)),
    itemCondition: p.condition === "NEW" ? "https://schema.org/NewCondition" : p.condition === "REFURBISHED" ? "https://schema.org/RefurbishedCondition" : "https://schema.org/UsedCondition",
    offers: p.variants.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "KZT",
          lowPrice: minPrice,
          highPrice: Math.max(...p.variants.map((v) => v.price)),
          offerCount: p.variants.length,
          availability: p.variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        }
      : undefined,
    aggregateRating: rating ? { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: p.reviews.length } : undefined,
  };

  return (
    <div className="pb-10">
      <div className="container pt-6 md:pt-8">
        <Breadcrumbs
          items={[
            { label: t.common.home, href: "/" },
            { label: pick(locale, p.category.nameRu, p.category.nameKk), href: `/catalog/${p.category.slug}` },
            { label: p.name },
          ]}
        />
        <div className="mt-6">
          {p.condition === "USED" ? (
            <UsedModelNotice t={t} name={p.name} />
          ) : (
            <ProductMain
              product={{ id: p.id, slug: p.slug, name: p.name, kind: p.kind, category: p.category.slug, brand: p.brand.name }}
              images={p.images.map((im) => ({ url: im.url, alt: im.alt ?? p.name, variantColor: p.variants.find((v) => v.id === im.variantId)?.color ?? null }))}
              variants={p.variants.map((v) => ({ id: v.id, sku: v.sku, color: v.color, colorHex: v.colorHex, storageGb: v.storageGb, ramGb: v.ramGb, price: v.price, oldPrice: v.oldPrice, stock: v.stock }))}
              installment={{ available: p.installmentAvailable && inst.enabled, maxTerm: Math.max(...inst.terms), minPrice: inst.minPrice, maxPrice: inst.maxPrice }}
              header={
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">{p.brand.name}</span>
                    {p.isNewArrival && <Badge tone="accent">{t.common.badgeNew}</Badge>}
                    {p.condition === "REFURBISHED" && <Badge tone="primary">{t.common.badgeRefurb}</Badge>}
                  </div>
                  <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight md:text-4xl">{p.name}</h1>
                  {rating && (
                    <a href="#reviews" className="mt-2 inline-flex items-center gap-1 text-sm text-graphite">
                      <span className="text-accent">★</span> {rating.toFixed(1)} · {p.reviews.length}
                    </a>
                  )}
                  {description && <p className="mt-4 leading-relaxed text-graphite">{description}</p>}
                </>
              }
              footer={
                <ul className="mt-8 divide-y divide-line border-y border-line text-[15px]">
                  <li className="flex gap-3 py-4">
                    <Icon name="truck" className="shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">{t.product.delivery}</span>
                      <span className="block text-graphite">
                        {delivery.map((d) => `${pick(locale, d.nameRu, d.nameKk)} — ${d.price === 0 ? t.cart.free : formatPrice(d.price)}`).join("; ")}
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-3 py-4">
                    <Icon name="shield" className="shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">{t.product.warranty}</span>
                      <span className="block text-graphite">{p.warranty || t.product.noWarranty}</span>
                    </span>
                  </li>
                  {p.equipment && (
                    <li className="flex gap-3 py-4">
                      <Icon name="box" className="shrink-0 text-primary" />
                      <span>
                        <span className="font-medium">{t.product.equipment}</span>
                        <span className="block text-graphite">{p.equipment}</span>
                      </span>
                    </li>
                  )}
                </ul>
              }
            />
          )}
        </div>
      </div>

      {/* Характеристики */}
      {p.specs.length > 0 && (
        <section className="container mt-16 md:mt-24" aria-labelledby="specs">
          <h2 id="specs" className="section-title">{t.product.specs}</h2>
          <div className="mt-8 grid gap-x-14 gap-y-10 md:grid-cols-2">
            {p.specs.map((g) => (
              <div key={g.group}>
                <h3 className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.12em] text-muted">{g.group}</h3>
                <dl className="divide-y divide-line border-t border-line">
                  {g.items.map((it) => (
                    <div key={it.label} className="grid grid-cols-[1fr_1.3fr] gap-4 py-3 text-[15px]">
                      <dt className="text-graphite">{it.label}</dt>
                      <dd className="font-medium">{it.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted">{t.product.specsNote}</p>
        </section>
      )}

      {compatModels.length > 0 && (
        <section className="container mt-14">
          <h2 className="section-title">{t.product.compatibleWith}</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {compatModels.map((m) => (
              <Link key={m.key} href={`/catalog/accessories?compat=${m.key}`} className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink">{m.label}</Link>
            ))}
          </div>
        </section>
      )}

      <Rail title={t.product.accessories} items={accessories} href={p.modelKey ? `/catalog/accessories?compat=${p.modelKey}` : undefined} linkLabel={t.common.showAll} />
      <Rail title={t.product.usedOfModel} eyebrow={t.common.badgeUsed} items={usedUnits} href="/used" linkLabel={t.common.showAll} />
      <Rail title={t.product.similar} items={similar} />

      <section id="reviews" className="container mt-4 scroll-mt-32" aria-labelledby="reviews-title">
        <h2 id="reviews-title" className="section-title">{t.product.reviews}</h2>
        {p.reviews.length ? (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {p.reviews.map((r) => (
              <li key={r.id} className="card p-6">
                <div className="text-accent">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></div>
                <p className="mt-3 leading-relaxed text-graphite">{r.text}</p>
                <p className="mt-3 text-sm text-muted">
                  {r.authorName}{r.isVerifiedPurchase && <span className="text-success"> · ✓ покупка подтверждена</span>} · {formatDate(r.createdAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-graphite">{t.product.noReviews}</p>
        )}
        <div className="mt-6">
          <ReviewForm productId={p.id} />
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}

function UsedModelNotice({ t, name }: { t: Awaited<ReturnType<typeof getDict>>["t"]; name: string }) {
  return (
    <div className="rounded-3xl bg-surface p-8 md:p-12">
      <h1 className="font-display text-3xl font-semibold">{name} — {t.common.badgeUsed}</h1>
      <p className="mt-3 max-w-xl text-graphite">{t.used.lead}</p>
      <Link href="/used" className="mt-6 inline-flex items-center gap-1 font-medium text-accent hover:underline">{t.home.ctaUsed} <Icon name="arrowRight" size={16} /></Link>
    </div>
  );
}
