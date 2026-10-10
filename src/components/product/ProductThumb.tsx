import Image from "next/image";
import { ProductArt } from "./ProductArt";

type ThumbSource = { image: { url: string; alt: string } | null; kind: string; category?: string | null; colorHex?: string | null; brand?: string; name: string };

/** Изображение товара: фото, если загружено, иначе векторная иллюстрация */
export function ProductThumb({ card, className = "", sizes = "80px", priority }: { card: ThumbSource; className?: string; sizes?: string; priority?: boolean }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-xl bg-surface ${className}`}>
      {card.image ? (
        <Image src={card.image.url} alt={card.image.alt || card.name} fill sizes={sizes} className="object-contain p-1" priority={priority} unoptimized={card.image.url.startsWith("/api/")} />
      ) : (
        <ProductArt kind={card.kind} category={card.category} color={card.colorHex} brand={card.brand} className="h-full w-full" />
      )}
    </span>
  );
}
