"use client";
import Link from "next/link";
import { useRef } from "react";
import type { OfferCard } from "@/server/services/catalog";
import { ProductCard } from "../product/ProductCard";
import { Icon } from "../ui/Icon";

/** Горизонтальная лента товаров со стрелками (на мобильных — свайп) */
export function Rail({ title, href, linkLabel, items, eyebrow, lead, dark }: { title: string; href?: string; linkLabel?: string; items: OfferCard[]; eyebrow?: string; lead?: string; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!items.length) return null;
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="section">
      <div className="container">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
            <h2 className={`section-title ${dark ? "text-white" : ""}`}>{title}</h2>
            {lead && <p className={`mt-3 max-w-xl ${dark ? "text-white/70" : "text-graphite"}`}>{lead}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {href && (
              <Link href={href} className={`mr-2 hidden items-center gap-1 text-sm font-medium sm:flex ${dark ? "text-white hover:text-accent" : "hover:text-accent"}`}>
                {linkLabel} <Icon name="arrowRight" size={16} />
              </Link>
            )}
            <button onClick={() => scroll(-1)} className={`hidden h-10 w-10 place-items-center rounded-full border md:grid ${dark ? "border-white/25 text-white hover:border-white" : "border-line hover:border-ink"}`} aria-label="Прокрутить назад">
              <Icon name="chevronLeft" size={18} />
            </button>
            <button onClick={() => scroll(1)} className={`hidden h-10 w-10 place-items-center rounded-full border md:grid ${dark ? "border-white/25 text-white hover:border-white" : "border-line hover:border-ink"}`} aria-label="Прокрутить вперёд">
              <Icon name="chevronRight" size={18} />
            </button>
          </div>
        </div>
        <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:gap-6 md:px-0">
          {items.map((c) => (
            <div key={`${c.type}-${c.id}`} className={`w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc(25%-18px)] ${dark ? "[&_a]:text-white [&_.text-ink]:text-white [&_.text-muted]:text-white/60 [&_.text-graphite]:text-white/75 [&_.text-primary]:text-accent" : ""}`}>
              <ProductCard card={c} />
            </div>
          ))}
        </div>
        {href && (
          <Link href={href} className={`mt-6 inline-flex items-center gap-1 text-sm font-medium sm:hidden ${dark ? "text-white" : ""}`}>
            {linkLabel} <Icon name="arrowRight" size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}
