"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { api, ApiError } from "@/lib/client/api";

export function SupportForm({ orders }: { orders: string[] }) {
  const router = useRouter();
  const [f, setF] = useState({ subject: "", message: "", orderNumber: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
          await api("/support/tickets", { method: "POST", body: { ...f, orderNumber: f.orderNumber || undefined } });
          setF({ subject: "", message: "", orderNumber: "" });
          setDone(true);
          router.refresh();
        } catch (err) {
          if (err instanceof ApiError) setErrors({ _: err.message, ...(err.details?.fields ?? {}) });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Тема" htmlFor="s-sub" error={errors.subject}><Input id="s-sub" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
      {orders.length > 0 && (
        <Field label="Заказ (необязательно)" htmlFor="s-ord">
          <select id="s-ord" value={f.orderNumber} onChange={(e) => setF({ ...f, orderNumber: e.target.value })} className="h-12 w-full rounded-xl border border-line bg-white px-4">
            <option value="">—</option>
            {orders.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      )}
      <Field label="Сообщение" htmlFor="s-msg" error={errors.message}><Textarea id="s-msg" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
      {errors._ && !errors.subject && !errors.message && <p className="text-sm text-danger">{errors._}</p>}
      {done && <p className="text-sm text-success">Обращение отправлено. Ответ появится на этой странице.</p>}
      <div><Button type="submit" loading={busy}>Отправить</Button></div>
    </form>
  );
}
