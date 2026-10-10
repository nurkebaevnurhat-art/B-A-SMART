"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { api, ApiError } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

export function RecoverForm() {
  const { t } = useI18n();
  const [login, setLogin] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "done")
    return (
      <p className="rounded-2xl bg-surface p-5 text-graphite">
        Если аккаунт с такими данными существует, мы отправили инструкцию по восстановлению. Письмо или SMS придут после подключения почтового/SMS-сервиса; до этого сообщение сохраняется в очереди уведомлений магазина.
      </p>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError(null);
        try {
          await api("/auth/password/forgot", { method: "POST", body: { login } });
          setState("done");
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t.common.error);
          setState("idle");
        }
      }}
    >
      <p className="text-graphite">{t.account.recoverText}</p>
      <Field label={t.account.loginField} htmlFor="rec" error={error ?? undefined}>
        <Input id="rec" value={login} onChange={(e) => setLogin(e.target.value)} required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={state === "busy"}>{t.account.send}</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "done")
    return (
      <p className="rounded-2xl bg-success/10 p-5 text-success">
        Пароль изменён. <Link href="/account/login" className="underline">Войти</Link>
      </p>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError(null);
        try {
          await api("/auth/password/reset", { method: "POST", body: { token, password } });
          setState("done");
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t.common.error);
          setState("idle");
        }
      }}
    >
      <Field label={t.account.newPassword} htmlFor="np" error={error ?? undefined} hint="Не короче 8 символов">
        <Input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={state === "busy"}>{t.common.save}</Button>
    </form>
  );
}
