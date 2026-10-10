import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addItem } from "@/server/services/cart";
import { createOrder } from "@/server/services/orders";
import { handleWebhook, startPayment } from "@/server/services/payments";
import { signMock } from "@/server/services/payments/mock";
import { checkout, newCart, tempVariant } from "./helpers";

async function onlineOrder() {
  const cart = await newCart();
  const v = await tempVariant(5, 50000);
  await addItem(cart.id, { variantId: v.id, quantity: 1 });
  const order = await createOrder(cart.id, { ...checkout, paymentMethod: "ONLINE" }, null);
  const payment = await startPayment(order.id, "http://test");
  return { order, payment };
}

const send = (body: object, sig?: string) => {
  const raw = JSON.stringify(body);
  return handleWebhook("mock", raw, new Headers({ "x-signature": sig ?? signMock(raw) }));
};

describe("Онлайн-оплата (тестовый провайдер)", () => {
  it("заказ ожидает оплаты, сумма платежа берётся из заказа", async () => {
    const { order, payment } = await onlineOrder();
    expect(order.status).toBe("AWAITING_PAYMENT");
    expect(payment.amount).toBe(order.total);
    expect(payment.isTest).toBe(true);
    expect(payment.redirectUrl).toMatch(/^\/pay\/test\//);
  });

  it("неверная подпись отклоняется, статус не меняется", async () => {
    const { order, payment } = await onlineOrder();
    await expect(send({ eventId: "x1", providerPaymentId: payment.providerPaymentId, status: "SUCCEEDED", amount: payment.amount }, "deadbeef")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("AWAITING_PAYMENT");
  });

  it("успешный платёж переводит заказ в «Оплачен», повтор события игнорируется", async () => {
    const { order, payment } = await onlineOrder();
    const ev = { eventId: `ok-${payment.id}`, providerPaymentId: payment.providerPaymentId, status: "SUCCEEDED", amount: payment.amount };
    expect(await send(ev)).toMatchObject({ duplicate: false, status: "SUCCEEDED" });
    expect(await send(ev)).toMatchObject({ duplicate: true });
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { history: true } });
    expect(o.status).toBe("PAID");
    expect(o.history.filter((h) => h.toStatus === "PAID")).toHaveLength(1);
  });

  it("несовпадение суммы — платёж не засчитывается", async () => {
    const { order, payment } = await onlineOrder();
    await send({ eventId: `amt-${payment.id}`, providerPaymentId: payment.providerPaymentId, status: "SUCCEEDED", amount: 1 });
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("FAILED");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("AWAITING_PAYMENT");
  });

  it("отказ банка оставляет заказ неоплаченным и позволяет повторить оплату", async () => {
    const { order, payment } = await onlineOrder();
    await send({ eventId: `fail-${payment.id}`, providerPaymentId: payment.providerPaymentId, status: "FAILED", amount: payment.amount, reason: "test" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("AWAITING_PAYMENT");
    const retry = await startPayment(order.id, "http://test");
    expect(retry.id).not.toBe(payment.id);
  });
});
