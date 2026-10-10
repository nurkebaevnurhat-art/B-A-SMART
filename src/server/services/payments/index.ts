import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { changeOrderStatus } from "../orders";
import { mockProvider } from "./mock";
import { freedomProvider, halykProvider, kaspiProvider } from "./unconfigured";
import type { PaymentProvider, WebhookEvent } from "./types";

const PROVIDERS: Record<string, PaymentProvider> = {
  mock: mockProvider,
  halyk: halykProvider,
  kaspi: kaspiProvider,
  freedom: freedomProvider,
};

export function getProvider(code = process.env.PAYMENT_PROVIDER || "mock"): PaymentProvider {
  const p = PROVIDERS[code];
  if (!p) throw new AppError("DISABLED", `Неизвестный платёжный провайдер: ${code}`);
  if (p.isTest && process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_PAYMENTS !== "true") {
    throw new AppError("DISABLED", "Онлайн-оплата не подключена");
  }
  return p;
}

export function paymentsAreTest(): boolean {
  try {
    return getProvider().isTest;
  } catch {
    return true;
  }
}

/** Создаёт платёжную сессию для заказа. Сумма берётся из заказа в БД, а не от клиента. */
export async function startPayment(orderId: string, baseUrl: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("NOT_FOUND", "Заказ не найден");
  if (order.paymentMethod !== "ONLINE") throw new AppError("BAD_REQUEST", "Для заказа выбран другой способ оплаты");
  if (order.status !== "AWAITING_PAYMENT") throw new AppError("CONFLICT", "Заказ не ожидает оплаты");

  const provider = getProvider();
  const pending = await db.payment.findFirst({ where: { orderId, status: "PENDING", provider: provider.code } });
  if (pending?.redirectUrl) return pending;

  const payment = await db.payment.create({
    data: { orderId, provider: provider.code, amount: order.total, isTest: provider.isTest },
  });
  const session = await provider.createSession({
    paymentId: payment.id,
    orderNumber: order.number,
    amount: order.total,
    description: `Заказ ${order.number}`,
    returnUrl: `${baseUrl}/order/${order.number}?t=${order.accessToken}`,
    webhookUrl: `${baseUrl}/api/v1/payments/webhook/${provider.code}`,
  });
  return db.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId: session.providerPaymentId, redirectUrl: session.redirectUrl },
  });
}

/**
 * Обработка уведомления провайдера. Идемпотентна: повторное событие с тем же eventId
 * игнорируется (уникальный индекс PaymentEvent.provider+eventId).
 */
export async function handleWebhook(providerCode: string, rawBody: string, headers: Headers) {
  const provider = getProvider(providerCode);
  const event = await provider.parseWebhook(rawBody, headers);
  return applyPaymentEvent(provider.code, event, rawBody);
}

export async function applyPaymentEvent(providerCode: string, event: WebhookEvent, rawBody: string) {
  return db.$transaction(async (tx) => {
    const exists = await tx.paymentEvent.findUnique({ where: { provider_eventId: { provider: providerCode, eventId: event.eventId } } });
    if (exists) return { duplicate: true as const };
    await tx.paymentEvent.create({ data: { provider: providerCode, eventId: event.eventId, payload: JSON.parse(rawBody) } });

    const payment = await tx.payment.findUnique({
      where: { provider_providerPaymentId: { provider: providerCode, providerPaymentId: event.providerPaymentId } },
      include: { order: true },
    });
    if (!payment) throw new AppError("NOT_FOUND", "Платёж не найден");
    if (payment.status !== "PENDING") return { duplicate: true as const, status: payment.status };

    if (event.status === "SUCCEEDED" && event.amount !== payment.amount) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "Сумма не совпадает с заказом" } });
      return { duplicate: false as const, status: "FAILED" as const };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: event.status, failureReason: event.status === "SUCCEEDED" ? null : event.reason ?? null },
    });
    if (event.status === "SUCCEEDED" && payment.order.status === "AWAITING_PAYMENT") {
      await changeOrderStatus(payment.orderId, "PAID", { actorId: null, comment: `Оплата подтверждена (${providerCode})` }, tx);
    }
    return { duplicate: false as const, status: event.status };
  });
}

export type { PaymentProvider, WebhookEvent };
