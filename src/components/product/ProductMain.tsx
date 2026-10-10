"use client";
import { useState, type ReactNode } from "react";
import { Gallery, type GalleryImage } from "./Gallery";
import { BuyBox } from "./BuyBox";
import { useI18n } from "@/lib/i18n/client";

type Variant = Parameters<typeof BuyBox>[0]["variants"][number];

export function ProductMain({
  product,
  images,
  variants,
  installment,
  header,
  footer,
}: {
  product: { id: string; slug: string; name: string; kind: string; category: string; brand: string };
  images: (GalleryImage & { variantColor: string | null })[];
  variants: Variant[];
  installment: { available: boolean; maxTerm: number; minPrice: number; maxPrice: number };
  header: ReactNode;
  footer: ReactNode;
}) {
  const { t } = useI18n();
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  const [hex, setHex] = useState<string | null>(first?.colorHex ?? null);
  const color = variants.find((v) => v.colorHex === hex)?.color ?? null;
  const own = images.filter((im) => im.variantColor && im.variantColor === color);
  const shown = own.length ? own : images.filter((im) => !im.variantColor);
  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      <div className="lg:sticky lg:top-36 lg:self-start">
        <Gallery images={shown} name={product.name} kind={product.kind} category={product.category} colorHex={hex} brand={product.brand} illustrationNote={t.product.illustration} />
      </div>
      <div>
        {header}
        <div className="mt-6">
          <BuyBox productId={product.id} slug={product.slug} variants={variants} installment={installment} onColorChange={setHex} />
        </div>
        {footer}
      </div>
    </div>
  );
}
