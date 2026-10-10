"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { calculateInstallment, type InstallmentSettings } from "@/lib/installment-calc";
import { formatDate, formatPrice } from "@/lib/format";
import { api, ApiError } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "../ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "../ui/Field";
import { PhoneInput, maskPhone } from "../ui/PhoneInput";
import { Icon } from "../ui/Icon";

export type InstallmentItem = { key: string; productId: string; variantId?: string; usedUnitId?: string; label: string; price: number; group: string };

export function InstallmentClient({
  items,
  settings,
  initialKey,
  defaults,
  cities,
}: {
  items: InstallmentItem[];
  settings: InstallmentSettings;
  initialKey?: string;
  defaults: { name: string; phone: string; city: string };
  cities: string[];
}) {
  const { t, locale } = useI18n();
  const [key, setKey] = useState(initialKey && items.some((i) => i.key === initialKey) ? initialKey : items[0]?.key);
  const item = items.find((i) => i.key === key);
  const [term, setTerm] = useState(settings.terms[Math.floor(settings.terms.length / 2)] ?? settings.terms[0]);
  const [downPct, setDownPct] = useState(Math.max(settings.minDownPercent, 20));
  const [form, setForm] = useState({ fullName: defaults.name, phone: defaults.phone ? maskPhone(defaults.phone) : "", city: defaults.city, comment: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<{ busy: boolean; done: string | null; error: string | null }>({ busy: false, done: null, error: null });

  const calc = useMemo(() => {
    if (!item) return null;
    const markupPct = settings.markupPercentByTerm[String(term)] ?? 0;
    const total = item.price + Math.round((item.price * markupPct) / 100);
    const down = Math.min(total - 1, Math.max(Math.ceil((total * settings.minDownPercent) / 100), Math.round((total * downPct) / 100)));
    try {
      return { ok: true as const, ...calculateInstallment({ price: item.price, downPayment: down, termMonths: term }, settings) };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "Ошибка расчёта" };
    }
  }, [item, term, downPct, settings]);

  const groups = [...new Set(items.map((i) => i.group))];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !calc?.ok) return;
    setState({ busy: true, done: null, error: null });
    setErrors({});
    try {
      const r = await api<{ number: string }>("/installment/applications", {
        method: "POST",
        body: {
          productId: item.productId,
          variantId: item.variantId,
          usedUnitId: item.usedUnitId,
          downPayment: calc.downPayment,
          termMonths: calc.termMonths,
          ...form,
        },
      });
      setState({ busy: false, done: r.number, error: null });
    } catch (err) {
      setErrors(err instanceof ApiError ? err.details?.fields ?? {} : {});
      setState({ busy: false, done: null, error: err instanceof ApiError ? err.message : t.common.error });
    }
  };

  if (!items.length) return <p className="text-graphite">Сейчас нет товаров, участвующих в программе.</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-3xl border border-line p-6 md:p-8">
        <h2 className="font-sans text-xl font-semibold">{t.installment.calc}</h2>
        <div className="mt-6 space-y-6">
          <Field label={t.installment.product} htmlFor="i-item">
            <Select id="i-item" value={key} onChange={(e) => setKey(e.target.value)}>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {items.filter((i) => i.group === g).map((i) => (
                    <option key={i.key} value={i.key}>{i.label} — {formatPrice(i.price)}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-graphite">{t.installment.term}</legend>
            <div className="flex flex-wrap gap-2">
              {settings.terms.map((m) => (
                <button key={m} type="button" onClick={() => setTerm(m)} aria-pressed={term === m} className={`h-11 min-w-[88px] rounded-full border px-4 text-sm font-medium ${term === m ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                  {m} {t.installment.months}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <label htmlFor="i-down" className="font-medium text-graphite">{t.installment.down}</label>
              <span className="font-semibold">{calc?.ok ? formatPrice(calc.downPayment) : "—"} <span className="font-normal text-muted">({downPct}%)</span></span>
            </div>
            <input
              id="i-down"
              type="range"
              min={settings.minDownPercent}
              max={80}
              step={5}
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
              className="w-full accent-[var(--c-accent)]"
            />
            <div className="mt-1 flex justify-between text-xs text-muted"><span>{settings.minDownPercent}%</span><span>80%</span></div>
          </div>
        </div>

        {calc && !calc.ok && <p className="mt-6 rounded-xl bg-danger/5 p-4 text-sm text-danger">{calc.message}</p>}
        {calc?.ok && (
          <>
            <dl className="mt-8 space-y-3 rounded-2xl bg-surface p-5 text-[15px]">
              <div className="flex justify-between"><dt className="text-graphite">Цена товара</dt><dd>{formatPrice(calc.price)}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite">{t.installment.markup}</dt><dd>{calc.markup ? formatPrice(calc.markup) : "0 ₸"}</dd></div>
              <div className="flex justify-between font-semibold"><dt>{t.installment.totalPrice}</dt><dd>{formatPrice(calc.totalPrice)}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite">{t.installment.down}</dt><dd>{formatPrice(calc.downPayment)}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite">Остаток к оплате</dt><dd>{formatPrice(calc.financed)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-line pt-3"><dt className="font-medium">{t.installment.monthly}</dt><dd className="font-display text-2xl font-semibold text-accent">{formatPrice(calc.monthly)}</dd></div>
            </dl>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary">{t.installment.schedule} ({calc.schedule.length})</summary>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  <tr className="border-b border-line"><td className="py-2">Взнос</td><td>при оформлении</td><td className="text-right">{formatPrice(calc.downPayment)}</td></tr>
                  {calc.schedule.map((r) => (
                    <tr key={r.seq} className="border-b border-line">
                      <td className="py-2">{r.label}</td>
                      <td>{formatDate(r.dueDate, locale)}</td>
                      <td className="text-right">{formatPrice(r.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold"><td className="py-2">Итого</td><td /><td className="text-right">{formatPrice(calc.totalPrice)}</td></tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted">Даты ориентировочные — фактический график фиксируется в договоре.</p>
            </details>
          </>
        )}
        {settings.isDemo && (
          <p className="mt-6 flex gap-2 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-sm text-graphite">
            <Icon name="info" size={20} className="shrink-0 text-accent" /> {t.installment.demo}
          </p>
        )}
      </div>

      <div className="rounded-3xl bg-primary p-6 text-white md:p-8">
        <h2 className="font-sans text-xl font-semibold">{t.installment.apply}</h2>
        {state.done ? (
          <div className="mt-6">
            <p className="text-lg">Заявка № {state.done} принята.</p>
            <p className="mt-2 text-white/75">Менеджер свяжется с вами, чтобы уточнить условия.{settings.isDemo ? " Пока программа в демонстрационном режиме, договоры не заключаются." : ""}</p>
            <Link href="/account/installments" className="mt-6 inline-block font-medium text-accent hover:underline">Мои заявки →</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4 [&_label]:text-white/80 [&_[role=alert]]:text-[#ffb4a8]" noValidate>
            <Field label="ФИО" htmlFor="a-name" error={errors.fullName} required>
              <Input id="a-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" />
            </Field>
            <Field label={t.common.phone} htmlFor="a-phone" error={errors.phone} required>
              <PhoneInput id="a-phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </Field>
            <Field label={t.common.city} htmlFor="a-city" error={errors.city} required>
              <Select id="a-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Комментарий" htmlFor="a-comment">
              <Textarea id="a-comment" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="!min-h-[80px]" />
            </Field>
            <Checkbox
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              label={<span className="text-white/85">Согласен(на) на обработку персональных данных для рассмотрения заявки (<Link href="/info/privacy" className="underline" target="_blank">политика</Link>)</span>}
            />
            {errors.consent && <p className="text-sm text-[#ffb4a8]">{errors.consent}</p>}
            {state.error && !Object.keys(errors).length && <p className="rounded-xl bg-white/10 p-3 text-sm">{state.error}</p>}
            <Button type="submit" variant="accent" size="lg" className="w-full" loading={state.busy} disabled={!calc?.ok}>
              {t.installment.apply}
            </Button>
            <p className="text-xs text-white/60">Документы не нужно загружать на сайт. Перечень документов менеджер сообщит при подтверждении заявки.</p>
          </form>
        )}
      </div>
    </div>
  );
}
