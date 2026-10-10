import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { addItem, releaseExpiredReservations, reserveCartUnits, toCartView, reloadCart } from "@/server/services/cart";
import { changeOrderStatus, createOrder, quoteCart } from "@/server/services/orders";
import { availableUnit, checkout, newCart, tempVariant, variantBySlug } from "./helpers";

describe("Корзина и заказ: серверный пересчёт", () => {
  it("итог считается сервером; подменённый expectedTotal отклоняется", async () => {
    const cart = await newCart();
    const { variant } = await variantBySlug("apple-iphone-15");
    await addItem(cart.id, { variantId: variant.id, quantity: 1 });
    const q = await quoteCart(cart.id, { deliveryCode: "courier_city" });
    expect(q.subtotal).toBe(variant.price);
    expect(q.total).toBe(variant.price + q.deliveryCost);
    await expect(createOrder(cart.id, { ...checkout, expectedTotal: 1 }, null)).rejects.toMatchObject({ code: "CONFLICT" });
    const order = await createOrder(cart.id, { ...checkout, expectedTotal: q.total }, null);
    expect(order.total).toBe(q.total);
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, history: true } });
    expect(saved.items[0].unitPrice).toBe(variant.price);
    expect(saved.history[0].toStatus).toBe("NEW");
    expect(await db.cartItem.count({ where: { cartId: cart.id } })).toBe(0);
  });

  it("бесплатная доставка от порога и промокод", async () => {
    const cart = await newCart();
    const v = await tempVariant(5, 120000);
    await addItem(cart.id, { variantId: v.id, quantity: 1 });
    const q = await quoteCart(cart.id, { deliveryCode: "courier_city", promoCode: "welcome5" });
    expect(q.discount).toBe(6000);
    expect(q.deliveryCost).toBe(0); // 114 000 ≥ 100 000
    await expect(quoteCart(cart.id, { promoCode: "NOPE" })).rejects.toBeInstanceOf(AppError);
  });

  it("нельзя положить больше, чем есть на складе", async () => {
    const cart = await newCart();
    const v = await tempVariant(2);
    await expect(addItem(cart.id, { variantId: v.id, quantity: 3 })).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  });

  it("остаток списывается при заказе и возвращается при отмене", async () => {
    const cart = await newCart();
    const v = await tempVariant(3);
    await addItem(cart.id, { variantId: v.id, quantity: 2 });
    const order = await createOrder(cart.id, checkout, null);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(1);
    await changeOrderStatus(order.id, "CANCELLED", { actorId: null, comment: "тест" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(3);
    await expect(changeOrderStatus(order.id, "DELIVERED", { actorId: null })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("последняя единица товара: из двух одновременных заказов проходит один", async () => {
    const v = await tempVariant(1);
    const [a, b] = [await newCart(), await newCart()];
    await addItem(a.id, { variantId: v.id, quantity: 1 });
    await addItem(b.id, { variantId: v.id, quantity: 1 });
    const res = await Promise.allSettled([createOrder(a.id, checkout, null), createOrder(b.id, checkout, null)]);
    expect(res.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(0);
  });
});

describe("Б/у: защита от двойной продажи", () => {
  it("бронь одной корзины блокирует другую", async () => {
    const unit = await availableUnit();
    const [a, b] = [await newCart(), await newCart()];
    await addItem(a.id, { usedUnitId: unit.id });
    await addItem(b.id, { usedUnitId: unit.id });
    const ra = await reserveCartUnits(a.id, 15);
    expect(ra.failed).toHaveLength(0);
    const rb = await reserveCartUnits(b.id, 15);
    expect(rb.failed).toEqual([unit.id]);
    const viewB = toCartView(await reloadCart(b.id));
    expect(viewB.hasProblems).toBe(true);
    await expect(createOrder(b.id, checkout, null)).rejects.toBeInstanceOf(AppError);
    const order = await createOrder(a.id, checkout, null);
    const sold = await db.usedUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(sold.status).toBe("SOLD");
    expect(sold.soldOrderId).toBe(order.id);
    // Повторно добавить проданный экземпляр нельзя
    await expect(addItem((await newCart()).id, { usedUnitId: unit.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Отмена возвращает экземпляр в продажу
    await changeOrderStatus(order.id, "CANCELLED", { actorId: null });
    expect((await db.usedUnit.findUniqueOrThrow({ where: { id: unit.id } })).status).toBe("AVAILABLE");
  });

  it("одновременные заказы одного экземпляра без брони: продаётся ровно один раз", async () => {
    const unit = await availableUnit();
    const carts = await Promise.all([newCart(), newCart(), newCart()]);
    for (const c of carts) await addItem(c.id, { usedUnitId: unit.id });
    const res = await Promise.allSettled(carts.map((c) => createOrder(c.id, checkout, null)));
    expect(res.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.orderItem.count({ where: { usedUnitId: unit.id, order: { status: { not: "CANCELLED" } } } })).toBe(1);
  });

  it("просроченная бронь снимается", async () => {
    const unit = await availableUnit();
    const a = await newCart();
    await addItem(a.id, { usedUnitId: unit.id });
    await reserveCartUnits(a.id, 15);
    await db.usedUnit.update({ where: { id: unit.id }, data: { reservedUntil: new Date(Date.now() - 1000) } });
    const b = await newCart();
    await addItem(b.id, { usedUnitId: unit.id });
    expect((await reserveCartUnits(b.id, 15)).failed).toHaveLength(0);
    await db.usedUnit.update({ where: { id: unit.id }, data: { reservedUntil: new Date(Date.now() - 1000) } });
    expect(await releaseExpiredReservations()).toBeGreaterThanOrEqual(1);
  });
});
