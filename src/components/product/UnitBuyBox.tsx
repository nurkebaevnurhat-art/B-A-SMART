"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { useShop } from "../ShopProvider";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

export function UnitBuyBox({ unitId, code, productSlug, price, oldPrice, available, reservedActive, sold, monthly }: { unitId: string; code: string; productSlug: string; price: number; oldPrice: number | null; available: boolean; reservedActive: boolean; sold: boolean; monthly: number | null }) {
  const { t } = useI18n();
  const { addToCart, favorites, toggleFavorite } = useShop();
  const [busy, setBusy] = useState(false);
  const isFav = favorites.has(`u:${unitId}`);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{formatPrice(price)}</span>
        {oldPrice && oldPrice > price && <s className="text-lg text-muted">{formatPrice(oldPrice)}</s>}
      </div>
      <p className={`mt-2 text-sm ${available ? "text-success" : "text-muted"}`}>
        {available ? t.common.inStock : sold ? t.used.soldNote : t.used.reservedNote}
      </p>
      <div className="mt-6 flex gap-3">
        <Button
          size="lg"
          className="flex-1"
          disabled={!available}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await addToCart({ usedUnitId: unitId });
            setBusy(false);
          }}
        >
          <Icon name="bag" size={20} /> {available ? t.common.toCart : reservedActive ? t.common.reserved : t.common.outOfStock}
        </Button>
        <Button size="lg" variant="outline" className="!px-4" onClick={() => toggleFavorite(`u:${unitId}`)} aria-pressed={isFav} aria-label={t.common.favorites}>
          <Icon name="heart" fill={isFav ? "currentColor" : "none"} className={isFav ? "text-accent" : ""} />
        </Button>
      </div>
      {monthly && available && (
        <Link href={`/installment?product=${productSlug}&unit=${code}`} className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-primary/5 px-5 py-4 hover:bg-primary/10">
          <span>
            <span className="block text-sm text-graphite">{t.nav.installment}</span>
            <span className="font-semibold text-primary">{t.product.installmentFrom} {formatPrice(monthly)} / {t.product.perMonth}</span>
          </span>
          <Icon name="arrowRight" className="text-primary" />
        </Link>
      )}
    </div>
  );
}
