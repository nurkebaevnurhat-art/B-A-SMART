"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ProductArt } from "../product/ProductArt";
import { buttonClass } from "../ui/Button";
import { Icon } from "../ui/Icon";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  theme: string;
};

const ART: Record<number, { color: string; brand: string }> = {
  0: { color: "#2E3A4F", brand: "Apple" },
  1: { color: "#D9692B", brand: "Apple" },
  2: { color: "#BDB6AC", brand: "Apple" },
};

export function HeroSlider({ slides, secondary }: { slides: HeroSlide[]; secondary: { label: string; href: string }[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), 7000);
    return () => clearInterval(id);
  }, [n, paused]);

  if (!n) return null;
  return (
    <section
      className="relative overflow-hidden bg-primary-dark text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Предложения"
    >
      {slides.map((s, idx) => {
        const theme =
          s.theme === "light" ? "bg-surface text-ink" : s.theme === "brand" ? "bg-[radial-gradient(120%_120%_at_80%_20%,#33627e_0%,var(--c-primary-dark)_60%)]" : "bg-[radial-gradient(100%_100%_at_75%_30%,#2a4659_0%,#0f1c25_70%)]";
        const dark = s.theme !== "light";
        return (
          <div
            key={s.id}
            className={`${idx === i ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0"} transition-opacity duration-700 ${theme}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} / ${n}`}
            aria-hidden={idx !== i}
          >
            <div className="container grid min-h-[520px] items-center gap-6 py-12 md:min-h-[600px] md:grid-cols-[1.1fr_1fr] md:py-16">
              <div className={idx === i ? "animate-fade-up" : ""}>
                <h1 className={`font-display text-[34px] font-semibold leading-[1.08] tracking-tight md:text-[56px] lg:text-[64px] ${dark ? "text-white" : "text-ink"}`}>{s.title}</h1>
                {s.subtitle && <p className={`mt-5 max-w-lg text-[17px] leading-relaxed md:text-lg ${dark ? "text-white/75" : "text-graphite"}`}>{s.subtitle}</p>}
                <div className="mt-8 flex flex-wrap gap-3">
                  {s.ctaHref && s.ctaLabel && (
                    <Link href={s.ctaHref} className={buttonClass("accent", "lg")}>{s.ctaLabel}</Link>
                  )}
                  {secondary.map((b) => (
                    <Link key={b.href} href={b.href} className={buttonClass(dark ? "outline" : "outline", "lg", dark ? "!border-white/30 !bg-transparent !text-white hover:!border-white" : "")}>
                      {b.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-[460px]">
                {s.imageUrl ? (
                  <Image src={s.imageUrl} alt={s.title} fill priority={idx === 0} sizes="(max-width:768px) 90vw, 460px" className="object-contain" />
                ) : (
                  <ProductArt kind="SMARTPHONE" color={ART[idx % 3].color} brand={ART[idx % 3].brand} className="h-full w-full drop-shadow-2xl" />
                )}
              </div>
            </div>
          </div>
        );
      })}
      {n > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-10">
          <div className="container flex items-center gap-3">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-10 bg-accent" : "w-5 bg-current opacity-30 hover:opacity-60"} ${slides[i].theme === "light" ? "text-ink" : "text-white"}`}
                aria-label={`Слайд ${idx + 1}`}
                aria-current={idx === i}
              />
            ))}
            <div className={`ml-auto hidden gap-2 md:flex ${slides[i].theme === "light" ? "text-ink" : "text-white"}`}>
              <button onClick={() => setI((i - 1 + n) % n)} className="grid h-10 w-10 place-items-center rounded-full border border-current/30 opacity-70 hover:opacity-100" aria-label="Предыдущий слайд">
                <Icon name="chevronLeft" size={18} />
              </button>
              <button onClick={() => setI((i + 1) % n)} className="grid h-10 w-10 place-items-center rounded-full border border-current/30 opacity-70 hover:opacity-100" aria-label="Следующий слайд">
                <Icon name="chevronRight" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
