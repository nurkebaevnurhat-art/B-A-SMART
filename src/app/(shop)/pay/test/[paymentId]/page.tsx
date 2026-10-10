import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { handleWebhook } from "@/server/services/payments";
import { signMock } from "@/server/services/payments/mock";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Тестовая оплата", robots: { index: false } };
export const dynamic = "force-dynamic";

function testPaymentsAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "true";
}

/**
 * Страница ТЕСТОВОГО платёжного провайдера. Имитирует внешний сервис оплаты:
 * формирует подписанное уведомление и передаёт его в общий обработчик вебхуков.
 */
async function simulate(formData: FormData) {
  "use server";
  if (!testPaymentsAllowed()) throw new Error("Тестовые платежи отключены");
  const paymentId = String(formData.get("paymentId"));
  const outcome = String(formData.get("outcome")) as "SUCCEEDED" | "FAILED" | "CANCELLED";
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.provider !== "mock" || !payment.providerPaymentId) notFound();
  const body = JSON.stringify({
    eventId: randomUUID(),
    providerPaymentId: payment.providerPaymentId,
    status: outcome,
    amount: payment.amount,
    reason: outcome === "FAILED" ? "Банк отклонил операцию (тест)" : outcome === "CANCELLED" ? "Отменено покупателем" : undefined,
  });
  await handleWebhook("mock", body, new Headers({ "x-signature": signMock(body) }));
  redirect(`/order/${payment.order.number}?t=${payment.order.accessToken}`);
}

export default async function TestPayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  if (!testPaymentsAllowed()) notFound();
  const { paymentId } = await params;
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.provider !== "mock") notFound();
  const done = payment.status !== "PENDING";
  return (
    <div className="container max-w-lg py-16">
      <div className="rounded-3xl border-2 border-dashed border-accent p-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
          <Icon name="alert" size={18} /> Тестовый режим
        </div>
        <p className="mt-2 text-sm text-graphite">Это имитация платёжного сервиса. Реальные платежи не подключены, деньги не списываются. Данные карты здесь не вводятся и не хранятся.</p>
        <div className="mt-8 text-sm text-muted">Заказ {payment.order.number}</div>
        <div className="font-display text-4xl font-semibold">{formatPrice(payment.amount)}</div>
        {done ? (
          <p className="mt-6">Платёж уже обработан: {payment.status}</p>
        ) : (
          <form action={simulate} className="mt-8 grid gap-3">
            <input type="hidden" name="paymentId" value={payment.id} />
            <Button name="outcome" value="SUCCEEDED" variant="accent" size="lg">Успешная оплата</Button>
            <Button name="outcome" value="FAILED" variant="outline" size="lg">Отказ банка</Button>
            <Button name="outcome" value="CANCELLED" variant="ghost" size="lg">Отменить</Button>
          </form>
        )}
      </div>
    </div>
  );
}
