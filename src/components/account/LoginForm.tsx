"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Checkbox, Field, Input } from "../ui/Field";
import { PhoneInput } from "../ui/PhoneInput";
import { useI18n } from "@/lib/i18n/client";
import { api, ApiError } from "@/lib/client/api";

export function LoginForm({ onSuccess, compact, initialTab = "login" }: { onSuccess: () => void; compact?: boolean; initialTab?: "login" | "register" }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [form, setForm] = useState({ login: "", password: "", name: "", phone: "", email: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      if (tab === "login") {
        await api("/auth/login", { method: "POST", body: { login: form.login, password: form.password } });
      } else {
        await api("/auth/register", {
          method: "POST",
          body: { name: form.name, phone: form.phone, email: form.email, password: form.password, consent: form.consent },
        });
      }
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details?.fields ?? {});
        setMessage(err.message);
      } else setMessage(t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-center gap-8" role="tablist">
        {(["login", "register"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => { setTab(k); setErrors({}); setMessage(null); }}
            className={`border-b-2 pb-2 text-sm font-semibold uppercase tracking-[0.12em] transition-colors ${tab === k ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {k === "login" ? t.account.loginTitle : t.account.register}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {tab === "login" ? (
          <>
            <Field label={t.account.loginField} htmlFor="login" error={errors.login}>
              <Input id="login" value={form.login} onChange={(e) => set("login")(e.target.value)} autoComplete="username" placeholder="+7 (___) ___-__-__ / email" required />
            </Field>
            <Field label={t.account.password} htmlFor="password" error={errors.password}>
              <Input id="password" type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} autoComplete="current-password" required />
            </Field>
          </>
        ) : (
          <>
            <Field label={t.checkout.name} htmlFor="r-name" error={errors.name} required>
              <Input id="r-name" value={form.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" />
            </Field>
            <Field label={t.common.phone} htmlFor="r-phone" error={errors.phone} required>
              <PhoneInput id="r-phone" value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label={t.checkout.email} htmlFor="r-email" error={errors.email}>
              <Input id="r-email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" />
            </Field>
            <Field label={t.account.password} htmlFor="r-pass" error={errors.password} hint="Не короче 8 символов" required>
              <Input id="r-pass" type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} autoComplete="new-password" />
            </Field>
            <Checkbox
              checked={form.consent}
              onChange={(e) => set("consent")(e.target.checked)}
              label={<>{t.account.consent} (<Link href="/info/privacy" className="link" target="_blank">политика</Link>)</>}
            />
            {errors.consent && <p className="text-sm text-danger">{errors.consent}</p>}
          </>
        )}
        {message && !Object.keys(errors).length && <p className="rounded-xl bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{message}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          {tab === "login" ? t.common.login : t.account.create}
        </Button>
        {tab === "login" && (
          <div className={`flex ${compact ? "justify-center" : "justify-between"} text-sm`}>
            <Link href="/account/recover" className="text-graphite hover:text-accent">{t.account.forgot}</Link>
          </div>
        )}
      </form>
    </div>
  );
}
