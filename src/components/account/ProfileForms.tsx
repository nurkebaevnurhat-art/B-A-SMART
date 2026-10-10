"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Field";
import { useToast } from "../ui/Toast";
import { api, ApiError } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

export function ProfileForm({ initial, cities }: { initial: { name: string; email: string; city: string; address: string; phone: string }; cities: string[] }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
          await api("/profile", { method: "PATCH", body: { name: f.name, email: f.email, city: f.city, address: f.address } });
          toast({ tone: "ok", text: "Профиль сохранён" });
          router.refresh();
        } catch (err) {
          if (err instanceof ApiError) {
            setErrors({ ...(err.details?.fields ?? {}), ...((err.details as { field?: string })?.field ? { [(err.details as { field: string }).field]: err.message } : {}) });
            toast({ tone: "error", text: err.message });
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label={t.checkout.name} htmlFor="p-name" error={errors.name}><Input id="p-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label={t.common.phone} htmlFor="p-phone" hint="Для смены телефона обратитесь в поддержку"><Input id="p-phone" value={f.phone} disabled /></Field>
      <Field label="Email" htmlFor="p-email" error={errors.email}><Input id="p-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label={t.common.city} htmlFor="p-city">
        <Select id="p-city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
          <option value="">—</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <div className="md:col-span-2"><Field label={t.checkout.address} htmlFor="p-addr"><Input id="p-addr" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
      <div><Button type="submit" loading={busy}>{t.common.save}</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const toast = useToast();
  const [f, setF] = useState({ current: "", next: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid max-w-md gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/auth/password/change", { method: "POST", body: f });
          setF({ current: "", next: "" });
          toast({ tone: "ok", text: "Пароль изменён" });
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Ошибка");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Текущий пароль" htmlFor="pw-c"><Input id="pw-c" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
      <Field label="Новый пароль" htmlFor="pw-n" error={error ?? undefined} hint="Не короче 8 символов"><Input id="pw-n" type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
      <div><Button type="submit" variant="outline" loading={busy}>Изменить пароль</Button></div>
    </form>
  );
}
