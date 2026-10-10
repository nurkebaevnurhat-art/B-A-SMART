"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice, storageLabel } from "@/lib/format";
import { useShop } from "../ShopProvider";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Badge } from "../ui/Badge";

type Variant = { id: string; sku: string; color: string | null; colorHex: string | null; storageGb: number | null; ramGb: number | null; price: number; oldPrice: number | null; stock: number };

export function BuyBox({
  productId,
  slug,
  variants,
  installment,
  onColorChange,
}: {
  productId: string;
  slug: string;
  variants: Variant[];
  installment: { available: boolean; maxTerm: number; minPrice: number; maxPrice: number };
  onColorChange?: (hex: string | null) => void;
}) {
  const { t } = useI18n();
  const { addToCart, favorites, toggleFavorite } = useShop();
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [color, setColor] = useState(firstInStock?.color ?? null);
  const [storage, setStorage] = useState(firstInStock?.storageGb ?? null);
  const [busy, setBusy] = useState(false);

  const colors = useMemo(() => {
    const m = new Map<string, string | null>();
    variants.forEach((v) => v.color && !m.has(v.color) && m.set(v.color, v.colorHex));
    return [...m];
  }, [variants]);
  const storages = useMemo(() => [...new Set(variants.map((v) => v.storageGb).filter((x): x is number => !!x))].sort((a, b) => a - b), [variants]);

  const selected =
    variants.find((v) => v.color === color && v.storageGb === storage) ??
    variants.find((v) => v.color === color) ??
    variants.find((v) => v.storageGb === storage) ??
    variants[0];

  if (!selected) return <p className="text-muted">{t.common.outOfStock}</p>;
  const isFav = favorites.has(`p:${productId}`);
  const sale = selected.oldPrice && selected.oldPrice > selected.price;
  const monthly = installment.available && selected.price >= installment.minPrice && selected.price <= installment.maxPrice ? Math.ceil(selected.price / installment.maxTerm) : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{formatPrice(selected.price)}</span>
        {sale && <s className="text-lg text-muted">{formatPrice(selected.oldPrice!)}</s>}
        {sale && <Badge tone="ink">−{Math.round((1 - selected.price / selected.oldPrice!) * 100)}%</Badge>}
      </div>
      <p className={`mt-2 text-sm ${selected.stock > 0 ? "text-success" : "text-muted"}`}>
        {selected.stock > 0 ? `${t.common.inStock}${selected.stock <= 3 ? ` · ${selected.stock} ${t.common.pcs}` : ""}` : t.common.outOfStock}
      </p>

      {colors.length > 0 && (
        <fieldset className="mt-7">
          <legend className="mb-3 text-sm text-graphite">
            {t.product.color}: <span className="font-medium text-ink">{color}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {colors.map(([name, hex]) => {
              const any = variants.some((v) => v.color === name && v.stock > 0);
              return (
                <button
                  key={name}
                  onClick={() => {
                    setColor(name);
                    onColorChange?.(hex);
                    if (!variants.some((v) => v.color === name && v.storageGb === storage)) setStorage(variants.find((v) => v.color === name)?.storageGb ?? null);
                  }}
                  title={name}
                  aria-label={name}
                  aria-pressed={color === name}
                  className={`relative h-10 w-10 rounded-full border-2 p-0.5 transition ${color === name ? "border-ink" : "border-transparent hover:border-line"} ${any ? "" : "opacity-40"}`}
                >
                  <span className="block h-full w-full rounded-full border border-black/10" style={{ background: hex ?? "#eee" }} />
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {storages.length > 0 && (
        <fieldset className="mt-6">
          <legend className="mb-3 text-sm text-graphite">{t.product.storage}</legend>
          <div className="flex flex-wrap gap-2">
            {storages.map((s) => {
              const v = variants.find((x) => x.storageGb === s && (color ? x.color === color : true));
              return (
                <button
                  key={s}
                  onClick={() => setStorage(s)}
                  disabled={!v}
                  aria-pressed={storage === s}
                  className={`min-w-[88px] rounded-2xl border px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${storage === s ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink"}`}
                >
                  <span className="block font-semibold">{storageLabel(s)}</span>
                  {v && <span className="text-xs text-muted">{formatPrice(v.price)}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-8 flex gap-3">
        <Button
          size="lg"
          variant="primary"
          className="flex-1"
          disabled={selected.stock <= 0}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await addToCart({ variantId: selected.id });
            setBusy(false);
          }}
        >
          <Icon name="bag" size={20} /> {selected.stock > 0 ? t.common.toCart : t.common.outOfStock}
        </Button>
        <Button size="lg" variant="outline" className="!px-4" onClick={() => toggleFavorite(`p:${productId}`)} aria-pressed={isFav} aria-label={t.common.favorites}>
          <Icon name="heart" fill={isFav ? "currentColor" : "none"} className={isFav ? "text-accent" : ""} />
        </Button>
      </div>

      {monthly && (
        <Link href={`/installment?product=${slug}&variant=${selected.id}`} className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10">
          <span>
            <span className="block text-sm text-graphite">{t.nav.installment}</span>
            <span className="font-semibold text-primary">
              {t.product.installmentFrom} {formatPrice(monthly)} / {t.product.perMonth}
            </span>
          </span>
          <Icon name="arrowRight" className="text-primary" />
        </Link>
      )}
      <p className="mt-4 text-xs text-muted">{t.product.sku}: {selected.sku}</p>
    </div>
  );
}
