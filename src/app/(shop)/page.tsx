import Link from "next/link";
import { db } from "@/lib/db";
import { getDict, pick } from "@/lib/i18n/server";
import { formatDate, formatPrice } from "@/lib/format";
import { getProductCollection, getUsedCollection } from "@/server/services/catalog";
import { latestApprovedReviews } from "@/server/services/reviews";
import { getSetting } from "@/server/services/settings";
import { calculateInstallment } from "@/server/services/installment";
import { HeroSlider } from "@/components/home/HeroSlider";
import { Rail } from "@/components/home/Rail";
import { Faq } from "@/components/home/Faq";
import { ProductCard, ProductGrid } from "@/components/product/ProductCard";
import { ProductArt } from "@/components/product/ProductArt";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { homeContent } from "@/content/home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { locale, t } = await getDict();
  const c = homeContent(locale);
  const [banners, popular, newArrivals, newPhones, used, accessories, featured, reviews, delivery, inst, categories] = await Promise.all([
    db.banner.findMany({ where: { isActive: true, placement: "hero" }, orderBy: { sortOrder: "asc" } }),
    getProductCollection("popular", 10),
    getProductCollection("newArrivals", 8),
    getProductCollection("new", 8),
    getUsedCollection(10),
    getProductCollection("accessories", 10),
    getProductCollection("featured", 4),
    latestApprovedReviews(6),
    db.deliveryOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getSetting("installment"),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  // Пример расчёта рассрочки на реальном товаре из каталога
  const example = popular.find((p) => p.installmentAvailable && p.price >= inst.minPrice && p.price <= inst.maxPrice);
  let exampleCalc = null;
  if (inst.enabled && example) {
    try {
      const term = Math.max(...inst.terms);
      exampleCalc = { card: example, ...calculateInstallment({ price: example.price, downPayment: Math.ceil((example.price * Math.max(inst.minDownPercent, 20)) / 100), termMonths: term }, inst) };
    } catch {
      exampleCalc = null;
    }
  }

  const tiles = [
    { href: "/catalog/smartphones?condition=NEW", label: t.nav.newPhones, color: "#2E3A4F", kind: "SMARTPHONE", cat: "smartphones", brand: "Apple" },
    { href: "/used", label: t.nav.usedPhones, color: "#BDB6AC", kind: "SMARTPHONE", cat: "smartphones", brand: "Samsung" },
    { href: "/catalog/tablets", label: pick(locale, categories.find((x) => x.slug === "tablets")?.nameRu, categories.find((x) => x.slug === "tablets")?.nameKk), color: "#AFC3D6", kind: "TABLET", cat: "tablets", brand: "" },
    { href: "/catalog/smartwatches", label: t.nav.watches, color: "#59665A", kind: "WATCH", cat: "smartwatches", brand: "" },
    { href: "/catalog/headphones", label: pick(locale, categories.find((x) => x.slug === "headphones")?.nameRu, categories.find((x) => x.slug === "headphones")?.nameKk), color: "#F4F4F4", kind: "HEADPHONES", cat: "headphones", brand: "" },
    { href: "/catalog/accessories", label: t.nav.accessories, color: "#F07F04", kind: "ACCESSORY", cat: "cases", brand: "" },
  ];

  const hero = banners.map((b) => ({ id: b.id, title: pick(locale, b.title, b.titleKk), subtitle: pick(locale, b.subtitle, b.subtitleKk) || null, ctaLabel: b.ctaLabel, ctaHref: b.ctaHref, imageUrl: b.imageUrl, theme: b.theme }));

  return (
    <>
      {hero.length > 0 ? (
        <HeroSlider
          slides={hero}
          secondary={[
            { label: t.home.ctaUsed, href: "/used" },
            { label: t.home.ctaAccessories, href: "/catalog/accessories" },
          ]}
        />
      ) : (
        <section className="bg-primary-dark py-24 text-white">
          <div className="container">
            <h1 className="font-display text-5xl font-semibold">{t.home.heroTitle}</h1>
            <p className="mt-4 max-w-lg text-white/75">{t.home.heroText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/catalog/smartphones" variant="accent" size="lg">{t.home.ctaPhones}</ButtonLink>
              <ButtonLink href="/used" variant="light" size="lg">{t.home.ctaUsed}</ButtonLink>
              <ButtonLink href="/catalog/accessories" variant="light" size="lg">{t.home.ctaAccessories}</ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* Плитки категорий */}
      <section className="container pt-10 md:pt-14" aria-label={t.common.catalog}>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-6 md:gap-4 md:px-0">
          {tiles.map((tile) => (
            <Link key={tile.href} href={tile.href} className="group w-[38%] shrink-0 rounded-2xl bg-surface p-4 transition-colors hover:bg-[#eceef0] sm:w-[28%] md:w-auto">
              <ProductArt kind={tile.kind} category={tile.cat} color={tile.color} brand={tile.brand} className="mx-auto aspect-square w-full max-w-[150px] transition-transform duration-500 ease-smooth group-hover:-translate-y-1" />
              <div className="mt-2 text-center text-sm font-medium">{tile.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <Rail title={t.home.popular} items={popular} href="/catalog/smartphones?sort=popular" linkLabel={t.common.showAll} />

      {/* Коллекция: крупный блок + карточки (как в референсе) */}
      {featured.length > 0 && (
        <section className="container">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Link href={featured[0].href} className="group relative flex min-h-[380px] flex-col justify-end overflow-hidden rounded-3xl bg-[radial-gradient(120%_100%_at_70%_20%,#F59A3B_0%,#C25A08_45%,#3a2210_100%)] p-8 text-white md:min-h-[480px] md:p-10">
              <ProductArt kind={featured[0].kind} color={featured[0].colorHex} brand={featured[0].brand} className="absolute right-[-6%] top-[-4%] h-[85%] w-auto opacity-95 transition-transform duration-700 ease-smooth group-hover:scale-[1.03]" />
              <div className="relative">
                <div className="eyebrow !text-white/80">{t.home.recommended}</div>
                <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{featured[0].name}</h2>
                <p className="mt-2 text-white/85">{t.common.from} {formatPrice(featured[0].price)}</p>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {featured.slice(1, 3).map((card) => (
                <ProductCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Rail title={t.home.newArrivals} eyebrow={t.common.badgeNew} items={newArrivals} href="/catalog?sort=new" linkLabel={t.common.showAll} />

      {newPhones.length > 0 && (
        <section className="section pt-0">
          <div className="container">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="section-title">{t.home.newPhones}</h2>
              <Link href="/catalog/smartphones?condition=NEW" className="flex items-center gap-1 text-sm font-medium hover:text-accent">{t.common.showAll} <Icon name="arrowRight" size={16} /></Link>
            </div>
            <ProductGrid items={newPhones} />
          </div>
        </section>
      )}

      {/* Б/у */}
      <div className="bg-surface">
        <Rail title={t.home.usedPhones} eyebrow={t.common.badgeUsed} lead={t.home.usedLead} items={used} href="/used" linkLabel={t.common.showAll} />
        <section className="container pb-16 md:pb-20" aria-labelledby="used-check">
          <div className="rounded-3xl bg-white p-6 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="used-check" className="section-title">{t.home.usedCheckTitle}</h2>
              <Link href="/info/used-check" className="flex items-center gap-1 text-sm font-medium hover:text-accent">{t.common.more} <Icon name="arrowRight" size={16} /></Link>
            </div>
            <ol className="mt-8 grid gap-6 md:grid-cols-4">
              {c.usedSteps.map((s, i) => (
                <li key={s.title}>
                  <div className="font-display text-3xl font-semibold text-accent">0{i + 1}</div>
                  <div className="mt-3 font-semibold">{s.title}</div>
                  <p className="mt-2 text-[15px] leading-relaxed text-graphite">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <Rail title={t.home.accessories} items={accessories} href="/catalog/accessories" linkLabel={t.common.showAll} />

      {/* Халяльная рассрочка */}
      {inst.enabled && (
        <section className="container">
          <div className="grid overflow-hidden rounded-3xl bg-primary text-white lg:grid-cols-2">
            <div className="p-8 md:p-12">
              <div className="eyebrow">{t.nav.installment}</div>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-[40px]">{t.home.installmentTitle}</h2>
              <p className="mt-4 max-w-md text-white/80">{t.home.installmentText}</p>
              <ul className="mt-6 space-y-2 text-[15px] text-white/85">
                <li className="flex gap-2"><Icon name="check" className="text-accent" size={20} /> {locale === "kk" ? "Мерзімі" : "Сроки"}: {inst.terms.join(", ")} {t.installment.months}</li>
                <li className="flex gap-2"><Icon name="check" className="text-accent" size={20} /> {locale === "kk" ? "Пайызсыз және айыппұлсыз" : "Без процентов и штрафов"}</li>
              </ul>
              <ButtonLink href="/installment" variant="accent" size="lg" className="mt-8">{t.home.installmentCta}</ButtonLink>
              {inst.isDemo && <p className="mt-5 text-xs text-white/55">{t.installment.demo}</p>}
            </div>
            {exampleCalc && (
              <div className="bg-primary-dark/60 p-8 md:p-12">
                <div className="text-sm text-white/60">{locale === "kk" ? "Есеп мысалы" : "Пример расчёта"}</div>
                <div className="mt-1 text-lg font-medium">{exampleCalc.card.name}</div>
                <dl className="mt-6 space-y-3 text-[15px]">
                  <Row k={t.installment.totalPrice} v={formatPrice(exampleCalc.totalPrice)} />
                  <Row k={t.installment.down} v={formatPrice(exampleCalc.downPayment)} />
                  <Row k={t.installment.term} v={`${exampleCalc.termMonths} ${t.installment.months}`} />
                  <div className="border-t border-white/15 pt-3">
                    <Row k={t.installment.monthly} v={<span className="font-display text-2xl text-accent">{formatPrice(exampleCalc.monthly)}</span>} />
                  </div>
                </dl>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Преимущества */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">{t.home.advantages}</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {c.advantages.map((a) => (
              <div key={a.title}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Icon name={a.icon as IconName} />
                </span>
                <h3 className="mt-4 font-sans text-[17px] font-semibold">{a.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-graphite">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section pt-0">
          <div className="container">
            <h2 className="section-title mb-8">{t.home.recommended}</h2>
            <ProductGrid items={featured} />
          </div>
        </section>
      )}

      {/* Отзывы — только реальные, одобренные модератором */}
      {reviews.length > 0 && (
        <section className="section bg-surface">
          <div className="container">
            <h2 className="section-title mb-8">{t.home.reviews}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="card p-6">
                  <div className="text-accent" aria-label={`${r.rating} из 5`}>{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></div>
                  <blockquote className="mt-3 text-[15px] leading-relaxed text-graphite">{r.text}</blockquote>
                  <figcaption className="mt-4 text-sm">
                    <span className="font-medium">{r.authorName}</span>
                    {r.isVerifiedPurchase && <span className="ml-2 text-success">✓ покупка подтверждена</span>}
                    <span className="block text-muted">{r.product ? <Link href={`/product/${r.product.slug}`} className="hover:text-accent">{r.product.name}</Link> : null} · {formatDate(r.createdAt, locale)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="section-title">{t.home.faq}</h2>
          <Faq items={[...c.faq]} />
        </div>
      </section>

      {/* Доставка и гарантия — из настроек доставки в БД */}
      <section className="container pb-16">
        <div className="rounded-3xl border border-line p-6 md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="section-title">{t.home.deliveryWarranty}</h2>
            <Link href="/info/delivery" className="flex items-center gap-1 text-sm font-medium hover:text-accent">{t.common.more} <Icon name="arrowRight" size={16} /></Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {delivery.map((d) => (
              <div key={d.id}>
                <Icon name="truck" className="text-primary" />
                <div className="mt-3 font-semibold">{pick(locale, d.nameRu, d.nameKk)}</div>
                <p className="mt-1 text-[15px] text-graphite">
                  {d.price === 0 ? t.cart.free : formatPrice(d.price)}
                  {d.freeFrom !== null && d.price > 0 && <>, {locale === "kk" ? `${formatPrice(d.freeFrom)} бастап тегін` : `бесплатно от ${formatPrice(d.freeFrom)}`}</>}
                </p>
              </div>
            ))}
            <div>
              <Icon name="shield" className="text-primary" />
              <div className="mt-3 font-semibold">{t.product.warranty}</div>
              <p className="mt-1 text-[15px] text-graphite">
                {locale === "kk" ? "Кепілдік шарттары әр тауардың бетінде көрсетілген." : "Условия гарантии указаны на странице каждого товара и экземпляра."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-white/65">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
