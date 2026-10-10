"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CartView } from "@/server/services/cart";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { api, ApiError } from "@/lib/client/api";
import { useShop } from "../ShopProvider";
import { useToast } from "../ui/Toast";
import { ButtonLink } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { ProductThumb } from "../product/ProductThumb";

export function CartClient({ initial }: { initial: CartView }) {
  const { t } = useI18n();
  const { setCartCount } = useShop();
  const toast = useToast();
  const router = useRouter();
  const [cart, setCart] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const mutate = async (id: string, fn: () => Promise<CartView>) => {
    setBusy(id);
    try {
      const next = await fn();
      setCart(next);
      setCartCount(next.count);
      router.refresh();
    } catch (e) {
      toast({ tone: "error", text: e instanceof ApiError ? e.message : t.common.error });
    } finally {
      setBusy(null);
    }
  };

  if (!cart.lines.length) {
    return (
      <div className="rounded-3xl bg-surface px-6 py-20 text-center">
        <Icon name="bag" size={40} className="mx-auto text-muted" />
        <h2 className="mt-4 font-sans text-2xl font-semibold">{t.cart.empty}</h2>
        <p className="mt-2 text-graphite">{t.cart.emptyText}</p>
        <ButtonLink href="/catalog/smartphones" className="mt-8" size="lg">{t.cart.toCatalog}</ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y divide-line border-y border-line">
        {cart.lines.map((l) => (
          <li key={l.id} className={`flex gap-4 py-6 md:gap-6 ${busy === l.id ? "opacity-60" : ""}`}>
            <Link href={l.href} className="shrink-0">
              <ProductThumb card={{ image: l.image, kind: l.productKind, colorHex: l.colorHex, brand: l.brand, name: l.name }} className="h-24 w-24 md:h-28 md:w-28" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link href={l.href} className="font-medium hover:text-primary md:text-[17px]">{l.name}</Link>
                  <p className="mt-1 text-sm text-muted">{l.details.join(" · ")}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatPrice(l.lineTotal)}</div>
                  {l.quantity > 1 && <div className="text-xs text-muted">{formatPrice(l.unitPrice)} × {l.quantity}</div>}
                </div>
              </div>
              {l.problem && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-danger"><Icon name="alert" size={16} /> {l.problem}</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-4">
                {l.kind === "variant" ? (
                  <div className="inline-flex items-center rounded-full border border-line">
                    <button
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface disabled:opacity-40"
                      onClick={() => mutate(l.id, () => api(`/cart/items/${l.id}`, { method: "PATCH", body: { quantity: l.quantity - 1 } }))}
                      disabled={!!busy}
                      aria-label="Уменьшить количество"
                    >
                      <Icon name="minus" size={16} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium" aria-live="polite">{l.quantity}</span>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface disabled:opacity-40"
                      onClick={() => mutate(l.id, () => api(`/cart/items/${l.id}`, { method: "PATCH", body: { quantity: l.quantity + 1 } }))}
                      disabled={!!busy || l.quantity >= l.maxQuantity}
                      aria-label="Увеличить количество"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted">1 {t.common.pcs} · уникальный экземпляр</span>
                )}
                <button
                  onClick={() => mutate(l.id, () => api(`/cart/items/${l.id}`, { method: "DELETE" }))}
                  disabled={!!busy}
                  className="flex items-center gap-1.5 text-sm text-graphite hover:text-danger"
                >
                  <Icon name="trash" size={18} /> <span className="hidden sm:inline">{t.cart.remove}</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-3xl bg-surface p-6">
          <dl className="space-y-3 text-[15px]">
            <div className="flex justify-between"><dt className="text-graphite">{t.cart.subtotal} ({cart.count})</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
            <div className="flex justify-between text-graphite"><dt>{t.cart.delivery}</dt><dd className="text-right text-sm">рассчитывается при оформлении</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>{t.cart.total}</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
          </dl>
          {cart.hasProblems && <p className="mt-4 text-sm text-danger">{t.cart.problems}</p>}
          <ButtonLink
            href="/checkout"
            size="lg"
            variant="accent"
            className={`mt-6 w-full ${cart.hasProblems ? "pointer-events-none opacity-50" : ""}`}
            aria-disabled={cart.hasProblems}
          >
            {t.cart.checkout}
          </ButtonLink>
        </div>
      </aside>
    </div>
  );
}
