import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { randomToken } from "@/server/auth/password";

export const MAX_QTY = 10;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true, slug: true, name: true, kind: true, condition: true, status: true, installmentAvailable: true,
              brand: { select: { name: true } },
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
            },
          },
        },
      },
      usedUnit: {
        include: {
          product: {
            select: {
              id: true, slug: true, name: true, kind: true, status: true, installmentAvailable: true,
              brand: { select: { name: true } },
            },
          },
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export type CartLine = {
  id: string;
  kind: "variant" | "unit";
  productId: string;
  variantId: string | null;
  usedUnitId: string | null;
  href: string;
  name: string;
  brand: string;
  productKind: string;
  details: string[];
  image: { url: string; alt: string } | null;
  colorHex: string | null;
  sku: string;
  unitPrice: number;
  oldPrice: number | null;
  quantity: number;
  maxQuantity: number;
  lineTotal: number;
  available: boolean;
  problem: string | null;
};

export type CartView = {
  id: string;
  token: string;
  lines: CartLine[];
  count: number;
  subtotal: number;
  hasProblems: boolean;
};

function storage(gb: number | null | undefined) {
  if (!gb) return null;
  return gb >= 1024 ? `${gb / 1024} ТБ` : `${gb} ГБ`;
}

export function toCartView(cart: CartWithItems, now = new Date()): CartView {
  const lines: CartLine[] = cart.items.map((it) => {
    if (it.variant) {
      const v = it.variant;
      const p = v.product;
      const sellable = v.isActive && p.status === "PUBLISHED";
      const available = sellable && v.stock >= it.quantity;
      return {
        id: it.id,
        kind: "variant",
        productId: p.id,
        variantId: v.id,
        usedUnitId: null,
        href: `/product/${p.slug}`,
        name: p.name,
        brand: p.brand.name,
        productKind: p.kind,
        details: [v.color, storage(v.storageGb), p.condition === "REFURBISHED" ? "Восстановленный" : null].filter((x): x is string => !!x),
        image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt ?? p.name } : null,
        colorHex: v.colorHex,
        sku: v.sku,
        unitPrice: v.price,
        oldPrice: v.oldPrice,
        quantity: it.quantity,
        maxQuantity: Math.max(0, Math.min(MAX_QTY, v.stock)),
        lineTotal: v.price * it.quantity,
        available,
        problem: !sellable ? "Товар больше не продаётся" : v.stock <= 0 ? "Нет в наличии" : v.stock < it.quantity ? `Доступно только ${v.stock} шт.` : null,
      };
    }
    const u = it.usedUnit!;
    const reservedByOther = u.status === "RESERVED" && u.reservedByCartId !== cart.id && !!u.reservedUntil && u.reservedUntil > now;
    const sellable = u.product.status === "PUBLISHED" && (u.status === "AVAILABLE" || u.status === "RESERVED");
    const available = sellable && !reservedByOther;
    return {
      id: it.id,
      kind: "unit",
      productId: u.product.id,
      variantId: null,
      usedUnitId: u.id,
      href: `/used/${u.code}`,
      name: u.product.name,
      brand: u.product.brand.name,
      productKind: u.product.kind,
      details: ["Б/у", u.color, storage(u.storageGb), `№ ${u.code}`].filter((x): x is string => !!x),
      image: u.images[0] ? { url: u.images[0].url, alt: u.images[0].alt ?? u.product.name } : null,
      colorHex: u.colorHex,
      sku: u.code,
      unitPrice: u.price,
      oldPrice: u.oldPrice,
      quantity: 1,
      maxQuantity: 1,
      lineTotal: u.price,
      available,
      problem: !sellable ? "Этот экземпляр уже продан" : reservedByOther ? "Экземпляр забронирован другим покупателем" : null,
    };
  });
  const ok = lines.filter((l) => l.available);
  return {
    id: cart.id,
    token: cart.token,
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal: ok.reduce((s, l) => s + l.lineTotal, 0),
    hasProblems: lines.some((l) => !l.available),
  };
}

export async function findCart(token: string | null | undefined, userId?: string | null) {
  if (userId) {
    const c = await db.cart.findUnique({ where: { userId }, include: cartInclude });
    if (c) return c;
  }
  if (!token) return null;
  const c = await db.cart.findUnique({ where: { token }, include: cartInclude });
  // Гость не может получить корзину, привязанную к другому пользователю
  if (c && c.userId && c.userId !== userId) return null;
  return c;
}

export async function getOrCreateCart(token: string | null | undefined, userId?: string | null) {
  const existing = await findCart(token, userId);
  if (existing) return existing;
  return db.cart.create({ data: { token: randomToken(24), userId: userId ?? null }, include: cartInclude });
}

export async function reloadCart(cartId: string) {
  return db.cart.findUniqueOrThrow({ where: { id: cartId }, include: cartInclude });
}

export const addItemSchema = z.union([
  z.object({ variantId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(MAX_QTY).default(1) }),
  z.object({ usedUnitId: z.string().min(1) }),
]);

export async function addItem(cartId: string, input: z.infer<typeof addItemSchema>) {
  if ("variantId" in input) {
    const v = await db.productVariant.findUnique({ where: { id: input.variantId }, include: { product: true } });
    if (!v || !v.isActive || v.product.status !== "PUBLISHED") throw new AppError("NOT_FOUND", "Товар не найден");
    const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId: v.id } } });
    const qty = Math.min(MAX_QTY, (existing?.quantity ?? 0) + input.quantity);
    if (v.stock < qty) {
      throw new AppError("OUT_OF_STOCK", v.stock > 0 ? `В наличии только ${v.stock} шт.` : "Товара нет в наличии");
    }
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: v.id } },
      create: { cartId, variantId: v.id, quantity: qty },
      update: { quantity: qty },
    });
  } else {
    const u = await db.usedUnit.findUnique({ where: { id: input.usedUnitId }, include: { product: true } });
    if (!u || u.product.status !== "PUBLISHED" || !["AVAILABLE", "RESERVED"].includes(u.status)) {
      throw new AppError("NOT_FOUND", "Экземпляр недоступен");
    }
    if (u.status === "RESERVED" && u.reservedByCartId !== cartId && u.reservedUntil && u.reservedUntil > new Date()) {
      throw new AppError("RESERVED", "Этот экземпляр сейчас оформляет другой покупатель. Попробуйте позже.");
    }
    await db.cartItem.upsert({
      where: { cartId_usedUnitId: { cartId, usedUnitId: u.id } },
      create: { cartId, usedUnitId: u.id, quantity: 1 },
      update: {},
    });
  }
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
}

export async function setItemQuantity(cartId: string, itemId: string, quantity: number) {
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId }, include: { variant: true } });
  if (!item) throw new AppError("NOT_FOUND", "Позиция не найдена");
  if (quantity <= 0) return removeItem(cartId, itemId);
  if (item.usedUnitId) return; // уникальный экземпляр — всегда 1 шт.
  const q = Math.min(MAX_QTY, quantity);
  if (item.variant && item.variant.stock < q) {
    throw new AppError("OUT_OF_STOCK", `В наличии только ${item.variant.stock} шт.`);
  }
  await db.cartItem.update({ where: { id: itemId }, data: { quantity: q } });
}

export async function removeItem(cartId: string, itemId: string) {
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId } });
  if (!item) return;
  await db.cartItem.delete({ where: { id: itemId } });
  if (item.usedUnitId) await releaseUnits(cartId, [item.usedUnitId]);
}

/** При входе переносим товары гостевой корзины в корзину пользователя */
export async function mergeGuestCart(guestToken: string | null | undefined, userId: string) {
  const userCart = await getOrCreateCart(null, userId);
  if (!guestToken || guestToken === userCart.token) return userCart;
  const guest = await db.cart.findUnique({ where: { token: guestToken }, include: { items: true } });
  if (!guest || guest.userId) return userCart;
  for (const it of guest.items) {
    if (it.variantId) {
      const ex = userCart.items.find((x) => x.variantId === it.variantId);
      await db.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: it.variantId } },
        create: { cartId: userCart.id, variantId: it.variantId, quantity: it.quantity },
        update: { quantity: Math.min(MAX_QTY, (ex?.quantity ?? 0) + it.quantity) },
      });
    } else if (it.usedUnitId) {
      await db.cartItem.upsert({
        where: { cartId_usedUnitId: { cartId: userCart.id, usedUnitId: it.usedUnitId } },
        create: { cartId: userCart.id, usedUnitId: it.usedUnitId },
        update: {},
      });
      await db.usedUnit.updateMany({ where: { id: it.usedUnitId, reservedByCartId: guest.id }, data: { reservedByCartId: userCart.id } });
    }
  }
  await db.cart.delete({ where: { id: guest.id } });
  return reloadCart(userCart.id);
}

/**
 * Резервирование уникальных б/у экземпляров на время оформления.
 * Атомарное условное обновление: экземпляр бронируется только если он свободен,
 * его бронь истекла или он уже забронирован этой же корзиной.
 */
export async function reserveCartUnits(cartId: string, minutes: number, tx: Tx = db) {
  const items = await tx.cartItem.findMany({ where: { cartId, usedUnitId: { not: null } }, select: { usedUnitId: true } });
  const now = new Date();
  const until = new Date(now.getTime() + minutes * 60_000);
  const failed: string[] = [];
  for (const { usedUnitId } of items) {
    const res = await tx.usedUnit.updateMany({
      where: {
        id: usedUnitId!,
        OR: [
          { status: "AVAILABLE" },
          { status: "RESERVED", reservedByCartId: cartId },
          { status: "RESERVED", reservedUntil: { lt: now } },
        ],
      },
      data: { status: "RESERVED", reservedByCartId: cartId, reservedUntil: until },
    });
    if (res.count === 0) failed.push(usedUnitId!);
  }
  return { reservedUntil: until, failed };
}

export async function releaseUnits(cartId: string, unitIds?: string[]) {
  await db.usedUnit.updateMany({
    where: { reservedByCartId: cartId, status: "RESERVED", ...(unitIds ? { id: { in: unitIds } } : {}) },
    data: { status: "AVAILABLE", reservedByCartId: null, reservedUntil: null },
  });
}

/** Снимает просроченные брони (вызывается периодически и перед выборками) */
export async function releaseExpiredReservations() {
  const r = await db.usedUnit.updateMany({
    where: { status: "RESERVED", reservedUntil: { lt: new Date() } },
    data: { status: "AVAILABLE", reservedByCartId: null, reservedUntil: null },
  });
  return r.count;
}
