"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ProductArt } from "./ProductArt";
import { Drawer } from "../ui/Drawer";
import { Icon } from "../ui/Icon";

export type GalleryImage = { url: string; alt: string };

/** Галерея с миниатюрами и увеличением. Без фото показывает иллюстрацию с честной подписью. */
export function Gallery({ images, name, kind, category, colorHex, brand, illustrationNote }: { images: GalleryImage[]; name: string; kind: string; category?: string; colorHex?: string | null; brand?: string; illustrationNote: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  useEffect(() => setI(0), [images.length]);
  const cur = images[i];

  if (!images.length) {
    return (
      <div>
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface">
          <ProductArt kind={kind} category={category} color={colorHex} brand={brand} className="h-full w-full p-6" />
        </div>
        <p className="mt-3 text-center text-xs text-muted">{illustrationNote}</p>
      </div>
    );
  }

  return (
    <div>
      <button className="group relative block aspect-square w-full overflow-hidden rounded-3xl bg-surface" onClick={() => setZoom(true)} aria-label="Увеличить фото">
        <Image src={cur.url} alt={cur.alt || name} fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-contain p-6" unoptimized={cur.url.startsWith("/api/")} />
        <span className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
          <Icon name="zoom" size={20} />
        </span>
      </button>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
          {images.map((im, idx) => (
            <button
              key={im.url + idx}
              onClick={() => setI(idx)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-surface ${idx === i ? "border-ink" : "border-transparent"}`}
              aria-label={`Фото ${idx + 1}`}
              aria-current={idx === i}
            >
              <Image src={im.url} alt="" fill sizes="80px" className="object-contain p-1" unoptimized={im.url.startsWith("/api/")} />
            </button>
          ))}
        </div>
      )}
      <Drawer open={zoom} onClose={() => setZoom(false)} side="center" title={name} width="max-w-5xl">
        <div className="relative h-[75vh] bg-white">
          <Image src={cur.url} alt={cur.alt || name} fill sizes="100vw" className="object-contain" unoptimized={cur.url.startsWith("/api/")} />
          {images.length > 1 && (
            <>
              <button onClick={() => setI((i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-soft" aria-label="Предыдущее фото"><Icon name="chevronLeft" /></button>
              <button onClick={() => setI((i + 1) % images.length)} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-soft" aria-label="Следующее фото"><Icon name="chevronRight" /></button>
            </>
          )}
        </div>
      </Drawer>
    </div>
  );
}
