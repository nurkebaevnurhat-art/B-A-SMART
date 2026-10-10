import { db } from "@/lib/db";
import { randomToken } from "@/server/auth/password";

export async function newCart() {
  return db.cart.create({ data: { token: randomToken(24) } });
}

export async function variantBySlug(slug: string, minStock = 1) {
  const p = await db.product.findUniqueOrThrow({ where: { slug }, include: { variants: { where: { stock: { gte: minStock } }, orderBy: { price: "asc" } } } });
  return { product: p, variant: p.variants[0] };
}

/** Временный вариант с заданным остатком — чтобы тесты не зависели друг от друга */
export async function tempVariant(stock: number, price = 100000) {
  const p = await db.product.findUniqueOrThrow({ where: { slug: "samsung-galaxy-a55" } });
  return db.productVariant.create({ data: { productId: p.id, sku: `TEST-${randomToken(6)}`, price, stock, color: "Тест" } });
}

export async function availableUnit() {
  const u = await db.usedUnit.findFirstOrThrow({ where: { status: "AVAILABLE" }, orderBy: { code: "asc" } });
  return u;
}

export const checkout = {
  customerName: "Тестовый Покупатель",
  phone: "+7 701 000 00 99",
  city: "Алматы",
  address: "ул. Тестовая, 1",
  deliveryCode: "courier_city",
  paymentMethod: "CASH_ON_DELIVERY" as const,
};
