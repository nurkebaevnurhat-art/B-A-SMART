"use client";
import Link from "next/link";
import { useState } from "react";
import type { OfferCard } from "@/server/services/catalog";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice, storageLabel } from "@/lib/format";
import { useShop } from "../ShopProvider";
import { Icon } from "../ui/Icon";
import { Badge } from "../ui/Badge";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { ProductThumb } from "./ProductThumb";

export function ProductCard({ card, priority }: { card: OfferCard; priority?: boolean }) {
  const { t } = useI18n();
  const { addToCart, favorites, toggleFavorite } = useShop();
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const favKey = card.type === "unit" ? `u:${card.id}` : `p:${card.id}`;
  const isFav = favorites.has(favKey);
  const sale = !!card.oldPrice && card.oldPrice > card.price;
  const multi = card.variants.filter((v) => v.stock > 0).length > 1;

  const quickAdd = async () => {
    if (!card.inStock) return;
    if (card.type === "unit") {
      setBusy(true);
      await addToCart({ usedUnitId: card.id });
      setBusy(false);
      return;
    }
    if (multi) return setPicker(true);
    const v = card.variants.find((x) => x.stock > 0);
    if (!v) return;
    setBusy(true);
    await addToCart({ variantId: v.id });
    setBusy(false);
  };

  const details: string[] = [];
  if (card.type === "unit") {
    if (card.storages[0]) details.push(storageLabel(card.storages[0])!);
    if (card.colors[0]) details.push(card.colors[0].name);
  } else if (card.storages.length) {
    details.push(card.storages.map((s) => storageLabel(s)).join(" · "));
  }

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-2xl bg-surface transition-shadow duration-300 group-hover:shadow-soft">
        <Link href={card.href} className="block aspect-square" tabIndex={-1} aria-hidden>
          <ProductThumb
            card={card}
            priority={priority}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-full w-full rounded-none bg-transparent transition-transform duration-500 ease-smooth md:group-hover:scale-[1.04]"
          />
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {card.isNewArrival && <Badge tone="accent">{t.common.badgeNew}</Badge>}
          {card.condition === "USED" && <Badge tone="primary">{t.common.badgeUsed}</Badge>}
          {card.condition === "REFURBISHED" && <Badge tone="primary">{t.common.badgeRefurb}</Badge>}
          {sale && <Badge tone="ink">{t.common.badgeSale}</Badge>}
        </div>
        <button
          onClick={() => toggleFavorite(favKey)}
          className={`absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full transition-colors ${isFav ? "text-accent" : "text-graphite hover:text-ink"}`}
          aria-label={t.common.favorites}
          aria-pressed={isFav}
        >
          <Icon name="heart" fill={isFav ? "currentColor" : "none"} />
        </button>
        {card.inStock && (
          <button
            onClick={quickAdd}
            disabled={busy}
            className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-soft transition-all hover:bg-ink hover:text-white md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            aria-label={`${t.common.toCart}: ${card.name}`}
          >
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Icon name="plus" />}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <Link href={card.href} className="text-[15px] font-medium leading-snug text-ink hover:text-primary md:text-base">
          {card.name}
        </Link>
        {(details.length > 0 || card.grade) && (
          <p className="mt-1 text-[13px] text-muted">
            {card.grade && <span className="text-graphite">{t.grades[card.grade]}</span>}
            {card.grade && details.length > 0 && " · "}
            {details.join(" · ")}
            {card.batteryHealth ? ` · АКБ ${card.batteryHealth}%` : ""}
          </p>
        )}
        {card.colors.length > 1 && (
          <div className="mt-2 flex gap-1.5" aria-label={t.product.color}>
            {card.colors.slice(0, 6).map((c) => (
              <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: c.hex ?? "#ddd" }} />
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-[17px] font-semibold tracking-tight">
            {card.type === "product" && card.variants.length > 1 && <span className="mr-1 text-sm font-normal text-muted">{t.common.from}</span>}
            {formatPrice(card.price)}
          </span>
          {sale && <s className="text-sm text-muted">{formatPrice(card.oldPrice!)}</s>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <span className={card.inStock ? "text-success" : "text-muted"}>{card.inStock ? t.common.inStock : card.type === "unit" ? t.common.reserved : t.common.outOfStock}</span>
          {card.installmentAvailable && (
            <Link href="/installment" className="text-primary hover:text-accent">{t.common.installmentAvailable}</Link>
          )}
        </div>
      </div>

      {card.type === "product" && (
        <Drawer open={picker} onClose={() => setPicker(false)} side="center" title={card.name} width="max-w-lg">
          <ul className="divide-y divide-line px-6 py-2">
            {card.variants.map((v) => (
              <li key={v.id} className="flex items-center gap-4 py-3">
                <span className="h-5 w-5 shrink-0 rounded-full border border-black/10" style={{ background: v.colorHex ?? "#eee" }} />
                <span className="flex-1 text-[15px]">
                  {[v.color, storageLabel(v.storageGb)].filter(Boolean).join(", ") || card.name}
                  <span className="block text-sm text-muted">{v.stock > 0 ? t.common.inStock : t.common.outOfStock}</span>
                </span>
                <span className="font-semibold">{formatPrice(v.price)}</span>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={v.stock <= 0}
                  onClick={async () => {
                    if (await addToCart({ variantId: v.id })) setPicker(false);
                  }}
                  aria-label={`${t.common.toCart}: ${[v.color, storageLabel(v.storageGb)].filter(Boolean).join(", ")}`}
                >
                  <Icon name="plus" size={16} />
                </Button>
              </li>
            ))}
          </ul>
        </Drawer>
      )}
    </article>
  );
}

export function ProductGrid({ items, priorityFirst = 0 }: { items: OfferCard[]; priorityFirst?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
      {items.map((c, i) => (
        <ProductCard key={`${c.type}-${c.id}`} card={c} priority={i < priorityFirst} />
      ))}
    </div>
  );
}
