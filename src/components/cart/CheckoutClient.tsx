"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Quote } from "@/server/services/orders";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { api, ApiError } from "@/lib/client/api";
import { useShop } from "../ShopProvider";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { PhoneInput, maskPhone } from "../ui/PhoneInput";
import { Icon } from "../ui/Icon";
import { ProductThumb } from "../product/ProductThumb";

type DeliveryOpt = { code: string; name: string; description: string | null; price: number; freeFrom: number | null; needsAddress: boolean };

export function CheckoutClient({
  initialQuote,
  deliveryOptions,
  cities,
  defaults,
  payments,
  hasUnits,
}: {
  initialQuote: Quote;
  deliveryOptions: DeliveryOpt[];
  cities: string[];
  defaults: { name: string; phone: string; email: string; city: string; address: string };
  payments: { cash: boolean; online: boolean; testMode: boolean };
  hasUnits: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { setCartCount } = useShop();
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [form, setForm] = useState({
    customerName: defaults.name,
    phone: defaults.phone ? maskPhone(defaults.phone) : "",
    email: defaults.email,
    city: defaults.city,
    address: defaults.address,
    comment: "",
    deliveryCode: deliveryOptions[0]?.code ?? "",
    paymentMethod: payments.cash ? "CASH_ON_DELIVERY" : "ONLINE",
  });
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reservedUntil, setReservedUntil] = useState<Date | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const delivery = deliveryOptions.find((d) => d.code === form.deliveryCode);

  // Резерв уникальных б/у экземпляров на время оформления
  const reserve = useCallback(async () => {
    if (!hasUnits) return;
    try {
      const r = await api<{ reservedUntil: string }>("/checkout/reserve", { method: "POST" });
      setReservedUntil(new Date(r.reservedUntil));
      setReserveError(null);
    } catch (e) {
      setReserveError(e instanceof ApiError ? e.message : t.common.error);
    }
  }, [hasUnits, t]);
  useEffect(() => {
    reserve();
  }, [reserve]);
  useEffect(() => {
    if (!reservedUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [reservedUntil]);

  const requote = useCallback(async (deliveryCode: string, promoCode: string | null) => {
    try {
      const q = await api<Quote>("/checkout/quote", { method: "POST", body: { deliveryCode, promoCode } });
      setQuote(q);
      return q;
    } catch (e) {
      throw e;
    }
  }, []);

  useEffect(() => {
    requote(form.deliveryCode, appliedPromo).catch(() => {});
  }, [form.deliveryCode, appliedPromo, requote]);

  const applyPromo = async () => {
    setPromoError(null);
    try {
      await requote(form.deliveryCode, promo.trim());
      setAppliedPromo(promo.trim().toUpperCase());
    } catch (e) {
      setPromoError(e instanceof ApiError ? e.message : t.common.error);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const order = await api<{ number: string; accessToken: string; paymentMethod: string }>("/orders", {
        method: "POST",
        body: { ...form, promoCode: appliedPromo ?? undefined, expectedTotal: quote.total, address: delivery?.needsAddress ? form.address : undefined },
      });
      setCartCount(0);
      if (order.paymentMethod === "ONLINE") {
        try {
          const pay = await api<{ redirectUrl: string }>(`/orders/${order.number}/pay`, { method: "POST", body: { token: order.accessToken } });
          window.location.href = pay.redirectUrl;
          return;
        } catch {
          // Заказ создан; оплатить можно со страницы заказа
        }
      }
      router.push(`/order/${order.number}?t=${order.accessToken}&new=1`);
    } catch (err) {
      if (err instanceof ApiError) {
        const f = { ...(err.details?.fields ?? {}) };
        const field = (err.details as { field?: string } | undefined)?.field;
        if (field) f[field] = err.message;
        setErrors(f);
        setMessage(err.message);
        if (err.code === "CONFLICT" && typeof (err.details as { total?: number })?.total === "number") {
          requote(form.deliveryCode, appliedPromo).catch(() => {});
        }
      } else setMessage(t.common.error);
      setBusy(false);
    }
  };

  const left = reservedUntil ? Math.max(0, Math.floor((reservedUntil.getTime() - now) / 1000)) : 0;

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div className="space-y-10">
        {hasUnits && (reservedUntil || reserveError) && (
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm ${reserveError ? "bg-danger/5 text-danger" : "bg-primary/5 text-primary"}`} role="status">
            <Icon name={reserveError ? "alert" : "clipboard"} size={20} />
            {reserveError ? (
              <span>{reserveError} <Link href="/cart" className="underline">{t.cart.title}</Link></span>
            ) : left > 0 ? (
              <span>{t.checkout.reservedUntil} {reservedUntil!.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} ({Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")})</span>
            ) : (
              <span>Время брони истекло. <button type="button" onClick={reserve} className="underline">Продлить</button></span>
            )}
          </div>
        )}

        <section>
          <h2 className="mb-5 font-sans text-xl font-semibold">{t.checkout.contacts}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.checkout.name} htmlFor="c-name" error={errors.customerName} required>
              <Input id="c-name" value={form.customerName} onChange={(e) => set("customerName")(e.target.value)} autoComplete="name" aria-invalid={!!errors.customerName} />
            </Field>
            <Field label={t.common.phone} htmlFor="c-phone" error={errors.phone} required>
              <PhoneInput id="c-phone" value={form.phone} onChange={set("phone")} aria-invalid={!!errors.phone} />
            </Field>
            <Field label={t.checkout.email} htmlFor="c-email" error={errors.email}>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" />
            </Field>
            <Field label={t.common.city} htmlFor="c-city" error={errors.city} required>
              <Select id="c-city" value={form.city} onChange={(e) => set("city")(e.target.value)}>
                {[...new Set([form.city, ...cities])].filter(Boolean).map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-5 font-sans text-xl font-semibold">{t.checkout.deliveryMethod}</h2>
          <div className="grid gap-3">
            {deliveryOptions.map((d) => {
              const free = d.price === 0 || (d.freeFrom !== null && quote.subtotal - quote.discount >= d.freeFrom);
              return (
                <label key={d.code} className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors ${form.deliveryCode === d.code ? "border-ink ring-1 ring-ink" : "border-line hover:border-graphite"}`}>
                  <input type="radio" name="delivery" className="mt-1 accent-[var(--c-ink)]" checked={form.deliveryCode === d.code} onChange={() => set("deliveryCode")(d.code)} />
                  <span className="flex-1">
                    <span className="block font-medium">{d.name}</span>
                    {d.description && <span className="mt-0.5 block text-sm text-muted">{d.description}</span>}
                  </span>
                  <span className="font-medium">{free ? t.cart.free : formatPrice(d.price)}</span>
                </label>
              );
            })}
          </div>
          {delivery?.needsAddress && (
            <div className="mt-4">
              <Field label={t.checkout.address} htmlFor="c-address" error={errors.address} required>
                <Input id="c-address" value={form.address} onChange={(e) => set("address")(e.target.value)} placeholder={t.checkout.addressPlaceholder} autoComplete="street-address" aria-invalid={!!errors.address} />
              </Field>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-5 font-sans text-xl font-semibold">{t.checkout.payment}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {payments.cash && (
              <PayOption checked={form.paymentMethod === "CASH_ON_DELIVERY"} onChange={() => set("paymentMethod")("CASH_ON_DELIVERY")} title={t.checkout.payCash} text={t.checkout.payCashText} icon="box" />
            )}
            {payments.online && (
              <PayOption checked={form.paymentMethod === "ONLINE"} onChange={() => set("paymentMethod")("ONLINE")} title={t.checkout.payOnline} text={t.checkout.payOnlineText} icon="card" />
            )}
          </div>
          {form.paymentMethod === "ONLINE" && payments.testMode && <p className="mt-3 text-sm text-accent-dark">{t.checkout.testPayments}</p>}
          <p className="mt-3 text-sm text-muted">
            {t.nav.installment}: <Link href="/installment" className="link">оформляется отдельной заявкой</Link>
          </p>
        </section>

        <section>
          <Field label={t.checkout.comment} htmlFor="c-comment">
            <Textarea id="c-comment" value={form.comment} onChange={(e) => set("comment")(e.target.value)} maxLength={1000} />
          </Field>
        </section>
      </div>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-3xl bg-surface p-6">
          <h2 className="font-sans text-lg font-semibold">{t.checkout.yourOrder}</h2>
          <ul className="mt-4 space-y-4">
            {quote.cart.lines.map((l) => (
              <li key={l.id} className="flex gap-3 text-sm">
                <ProductThumb card={{ image: l.image, kind: l.productKind, colorHex: l.colorHex, brand: l.brand, name: l.name }} className="h-14 w-14 bg-white" />
                <span className="flex-1">
                  <span className="block font-medium">{l.name}</span>
                  <span className="text-muted">{l.details.join(" · ")} · {l.quantity} {t.common.pcs}</span>
                  {l.problem && <span className="block text-danger">{l.problem}</span>}
                </span>
                <span className="font-medium">{formatPrice(l.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex gap-2">
            <Input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder={t.checkout.promo} className="!h-11 uppercase" aria-label={t.checkout.promo} />
            <Button type="button" variant="outline" onClick={applyPromo} disabled={!promo.trim()}>{t.checkout.applyPromo}</Button>
          </div>
          {promoError && <p className="mt-2 text-sm text-danger">{promoError}</p>}
          {appliedPromo && !promoError && <p className="mt-2 text-sm text-success">Промокод {appliedPromo} применён</p>}

          <dl className="mt-6 space-y-2.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-graphite">{t.cart.subtotal}</dt><dd>{formatPrice(quote.subtotal)}</dd></div>
            {quote.discount > 0 && <div className="flex justify-between text-success"><dt>{t.cart.discount}</dt><dd>−{formatPrice(quote.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-graphite">{t.cart.delivery}</dt><dd>{quote.deliveryCost ? formatPrice(quote.deliveryCost) : t.cart.free}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-xl font-semibold"><dt>{t.cart.total}</dt><dd>{formatPrice(quote.total)}</dd></div>
          </dl>
          {message && <p className="mt-4 rounded-xl bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{message}</p>}
          <Button type="submit" size="lg" variant="accent" className="mt-6 w-full" loading={busy} disabled={quote.cart.hasProblems || !!reserveError}>
            {t.checkout.confirm} · {formatPrice(quote.total)}
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {t.checkout.consent} <Link href="/info/terms" className="link">Условия</Link>, <Link href="/info/privacy" className="link">политика</Link>.
          </p>
        </div>
      </aside>
    </form>
  );
}

function PayOption({ checked, onChange, title, text, icon }: { checked: boolean; onChange: () => void; title: string; text: string; icon: "box" | "card" }) {
  return (
    <label className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors ${checked ? "border-ink ring-1 ring-ink" : "border-line hover:border-graphite"}`}>
      <input type="radio" name="payment" className="mt-1 accent-[var(--c-ink)]" checked={checked} onChange={onChange} />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-medium"><Icon name={icon} size={18} /> {title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
    </label>
  );
}
