"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { ProductThumb } from "../product/ProductThumb";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { api } from "@/lib/client/api";
import type { OfferCard } from "@/server/services/catalog";

const QUICK = ["iPhone 17", "iPhone 16", "Galaxy S25", "AirPods", "Чехол", "Зарядка"];

export function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<OfferCard[]>([]);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => input.current?.focus(), 20);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setItems(await api<OfferCard[]>(`/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal }));
      } catch {
        /* отменено или ошибка — не мешаем вводу */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  if (!open || typeof document === "undefined") return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    onClose();
    router.push(`/catalog?q=${encodeURIComponent(q.trim())}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t.common.search}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-white shadow-lift animate-fade-up">
        <form onSubmit={submit} className="container flex h-20 items-center gap-3" role="search">
          <Icon name="search" className="text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.common.searchPlaceholder}
            className="h-full flex-1 bg-transparent text-lg outline-none placeholder:text-muted md:text-xl"
            aria-label={t.common.searchPlaceholder}
            enterKeyHint="search"
          />
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-r-transparent" />}
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-surface" aria-label={t.common.close}>
            <Icon name="close" />
          </button>
        </form>
        <div className="container border-t border-line pb-6 pt-4">
          {items.length > 0 ? (
            <ul className="grid gap-1 md:grid-cols-2">
              {items.map((it) => (
                <li key={it.id}>
                  <Link href={it.href} onClick={onClose} className="flex items-center gap-4 rounded-xl p-2 hover:bg-surface">
                    <ProductThumb card={it} className="h-14 w-14" />
                    <span className="flex-1">
                      <span className="block text-[15px] font-medium">{it.name}</span>
                      <span className="text-sm text-muted">{t.common.from} {formatPrice(it.price)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : q.trim().length >= 2 && !loading ? (
            <p className="py-3 text-muted">{t.catalog.nothingFound}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {QUICK.map((s) => (
                <button key={s} onClick={() => setQ(s)} className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
