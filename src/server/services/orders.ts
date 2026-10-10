import { z } from "zod";
import type { OrderStatus, PaymentMethod, Prisma, PromoCode } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizePhone } from "@/lib/format";
import { randomToken } from "@/server/auth/password";
import { reloadCart, toCartView, type CartView } from "./cart";
import { getSetting } from "./settings";

// ───────────── Промокоды ─────────────

export function promoDiscount(promo: Pick<PromoCode, "type" | "value" | "minOrderTotal">, subtotal: number): number {
  if (subtotal < promo.minOrderTotal) return 0;
  const raw = promo.type === "PERCENT" ? Math.floor((subtotal * Math.min(promo.value, 100)) / 100) : promo.value;
  return Math.max(0, Math.min(raw, subtotal));
}

export async function findValidPromo(code: string | null | undefined, subtotal: number, tx: Tx = db) {
  if (!code) return null;
  const promo = await tx.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (
    !promo ||
    !promo.isActive ||
    (promo.startsAt && promo.startsAt > now) ||
    (promo.endsAt && promo.endsAt < now) ||
    (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
  ) {
    throw new AppError("VALIDATION", "Промокод недействителен или истёк", { field: "promoCode" });
  }
  if (subtotal < promo.minOrderTotal) {
    throw new AppError("VALIDATION", `Промокод действует для заказов от ${promo.minOrderTotal.toLocaleString("ru-RU")} ₸`, { field: "promoCode" });
  }
  return promo;
}

// ───────────── Расчёт стоимости (только на сервере) ─────────────

export type Quote = {
  cart: CartView;
  subtotal: number;
  discount: number;
  deliveryCost: number;
  total: number;
  delivery: { code: string; name: string; needsAddress: boolean } | null;
  promoCode: string | null;
};

export async function deliveryCostFor(code: string, subtotal: number, tx: Tx = db) {
  const opt = await tx.deliveryOption.findUnique({ where: { code } });
  if (!opt || !opt.isActive) throw new AppError("VALIDATION", "Выберите способ доставки", { field: "deliveryCode" });
  const cost = opt.freeFrom !== null && subtotal >= opt.freeFrom ? 0 : opt.price;
  return { opt, cost };
}

export async function quoteCart(cartId: string, opts: { deliveryCode?: string | null; promoCode?: string | null }, tx: Tx = db): Promise<Quote> {
  const cart = toCartView(await reloadCart(cartId));
  const subtotal = cart.subtotal;
  const promo = opts.promoCode ? await findValidPromo(opts.promoCode, subtotal, tx) : null;
  const discount = promo ? promoDiscount(promo, subtotal) : 0;
  let deliveryCost = 0;
  let delivery: Quote["delivery"] = null;
  if (opts.deliveryCode) {
    const d = await deliveryCostFor(opts.deliveryCode, subtotal - discount, tx);
    deliveryCost = d.cost;
    delivery = { code: d.opt.code, name: d.opt.nameRu, needsAddress: d.opt.needsAddress };
  }
  return { cart, subtotal, discount, deliveryCost, total: subtotal - discount + deliveryCost, delivery, promoCode: promo?.code ?? null };
}

// ───────────── Оформление заказа ─────────────

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Укажите имя").max(100),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const p = normalizePhone(v);
      if (!p) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Укажите номер в формате +7 XXX XXX XX XX" });
      return p ?? "";
    }),
  email: z.string().trim().email("Некорректный email").max(120).optional().or(z.literal("").transform(() => undefined)),
  city: z.string().trim().min(2, "Укажите город").max(80),
  address: z.string().trim().max(300).optional(),
  comment: z.string().trim().max(1000).optional(),
  deliveryCode: z.string().min(1, "Выберите способ доставки"),
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "ONLINE"]),
  promoCode: z.string().trim().max(40).optional(),
  /** Итог, который видел покупатель. Используется только для сверки — сервер считает сам. */
  expectedTotal: z.number().int().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

async function nextOrderNumber(tx: Tx): Promise<string> {
  const rows = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;
  return `BA-${rows[0].n.toString()}`;
}

export async function createOrder(cartId: string, input: CheckoutInput, userId: string | null) {
  const checkout = await getSetting("checkout");
  if (input.paymentMethod === "ONLINE" && !checkout.onlinePaymentEnabled) throw new AppError("VALIDATION", "Онлайн-оплата временно недоступна");
  if (input.paymentMethod === "CASH_ON_DELIVERY" && !checkout.cashOnDeliveryEnabled) throw new AppError("VALIDATION", "Оплата при получении недоступна");

  return db.$transaction(
    async (tx) => {
      const cartRow = await tx.cart.findUnique({ where: { id: cartId }, include: { items: true } });
      if (!cartRow || cartRow.items.length === 0) throw new AppError("BAD_REQUEST", "Корзина пуста");

      const quote = await quoteCart(cartId, { deliveryCode: input.deliveryCode, promoCode: input.promoCode }, tx);
      if (quote.cart.hasProblems) {
        throw new AppError("CONFLICT", "Некоторые товары в корзине недоступны. Проверьте корзину.", {
          lines: quote.cart.lines.filter((l) => !l.available).map((l) => ({ id: l.id, problem: l.problem })),
        });
      }
      if (quote.delivery?.needsAddress && !input.address) {
        throw new AppError("VALIDATION", "Укажите адрес доставки", { field: "address" });
      }
      if (input.expectedTotal !== undefined && input.expectedTotal !== quote.total) {
        throw new AppError("CONFLICT", "Стоимость заказа изменилась. Проверьте итоговую сумму и подтвердите заказ ещё раз.", {
          total: quote.total,
        });
      }

      const status: OrderStatus = input.paymentMethod === "ONLINE" ? "AWAITING_PAYMENT" : "NEW";
      const order = await tx.order.create({
        data: {
          number: await nextOrderNumber(tx),
          userId,
          status,
          customerName: input.customerName,
          phone: input.phone,
          email: input.email ?? null,
          city: input.city,
          address: input.address ?? null,
          comment: input.comment ?? null,
          deliveryCode: input.deliveryCode,
          paymentMethod: input.paymentMethod as PaymentMethod,
          subtotal: quote.subtotal,
          discount: quote.discount,
          deliveryCost: quote.deliveryCost,
          total: quote.total,
          accessToken: randomToken(24),
          items: {
            create: quote.cart.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              usedUnitId: l.usedUnitId,
              name: [l.brand && !l.name.startsWith(l.brand) ? l.brand : null, l.name, ...l.details.filter((d) => !d.startsWith("№"))]
                .filter(Boolean)
                .join(" · "),
              sku: l.sku,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              total: l.lineTotal,
            })),
          },
          history: { create: { fromStatus: null, toStatus: status, comment: "Заказ создан", actorId: userId } },
          shipment: { create: { deliveryCode: input.deliveryCode, cost: quote.deliveryCost } },
        },
      });

      // Списание остатков: условное обновление не даст уйти в минус при одновременных заказах
      for (const l of quote.cart.lines) {
        if (l.variantId) {
          const r = await tx.productVariant.updateMany({
            where: { id: l.variantId, isActive: true, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity } },
          });
          if (r.count === 0) throw new AppError("OUT_OF_STOCK", `«${l.name}» закончился. Обновите корзину.`);
          await tx.inventoryMovement.create({
            data: { variantId: l.variantId, delta: -l.quantity, reason: "order", orderId: order.id, actorId: userId },
          });
        } else if (l.usedUnitId) {
          // Уникальный экземпляр продаётся только если свободен или забронирован этой корзиной
          const r = await tx.usedUnit.updateMany({
            where: {
              id: l.usedUnitId,
              OR: [
                { status: "AVAILABLE" },
                { status: "RESERVED", reservedByCartId: cartId },
                { status: "RESERVED", reservedUntil: { lt: new Date() } },
              ],
            },
            data: { status: "SOLD", soldOrderId: order.id, reservedByCartId: null, reservedUntil: null },
          });
          if (r.count === 0) throw new AppError("RESERVED", `Экземпляр ${l.sku} уже продан или забронирован другим покупателем.`);
        }
        await tx.product.update({ where: { id: l.productId }, data: { salesCount: { increment: l.quantity } } });
      }

      if (quote.promoCode) {
        const promo = await tx.promoCode.findUniqueOrThrow({ where: { code: quote.promoCode } });
        const r = await tx.promoCode.updateMany({
          where: { id: promo.id, ...(promo.maxUses !== null ? { usedCount: { lt: promo.maxUses } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (r.count === 0) throw new AppError("VALIDATION", "Лимит использования промокода исчерпан", { field: "promoCode" });
        await tx.order.update({ where: { id: order.id }, data: { promoCodeId: promo.id } });
      }

      await tx.cartItem.deleteMany({ where: { cartId } });
      return order;
    },
    { isolationLevel: "ReadCommitted", timeout: 20_000 },
  );
}

// ───────────── Статусы заказа ─────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  AWAITING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачен",
  CONFIRMED: "Подтверждён",
  ASSEMBLING: "Собирается",
  SHIPPED: "Передан в доставку",
  DELIVERED: "Доставлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["CONFIRMED", "ASSEMBLING", "CANCELLED"],
  CONFIRMED: ["ASSEMBLING", "SHIPPED", "DELIVERED", "CANCELLED"],
  ASSEMBLING: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedTransitions(s: OrderStatus): OrderStatus[] {
  return TRANSITIONS[s];
}

/** Возврат остатков и б/у экземпляров при отмене */
async function restock(tx: Tx, orderId: string, actorId: string | null) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const it of items) {
    if (it.variantId) {
      await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
      await tx.inventoryMovement.create({ data: { variantId: it.variantId, delta: it.quantity, reason: "cancel", orderId, actorId } });
    }
    if (it.usedUnitId) {
      await tx.usedUnit.updateMany({
        where: { id: it.usedUnitId, soldOrderId: orderId },
        data: { status: "AVAILABLE", soldOrderId: null },
      });
    }
    await tx.product.update({ where: { id: it.productId }, data: { salesCount: { decrement: it.quantity } } });
  }
}

export async function changeOrderStatus(
  orderId: string,
  to: OrderStatus,
  opts: { actorId: string | null; comment?: string; force?: boolean },
  tx?: Tx,
) {
  const run = async (t: Tx) => {
    const order = await t.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("NOT_FOUND", "Заказ не найден");
    if (order.status === to) return order;
    if (!opts.force && !TRANSITIONS[order.status].includes(to)) {
      throw new AppError("CONFLICT", `Нельзя перевести заказ из статуса «${ORDER_STATUS_LABELS[order.status]}» в «${ORDER_STATUS_LABELS[to]}»`);
    }
    // Оптимистичная блокировка: статус не должен измениться параллельно
    const r = await t.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: to } });
    if (r.count === 0) throw new AppError("CONFLICT", "Статус заказа уже изменён. Обновите страницу.");
    if (to === "CANCELLED") await restock(t, orderId, opts.actorId);
    await t.orderStatusHistory.create({
      data: { orderId, fromStatus: order.status, toStatus: to, comment: opts.comment, actorId: opts.actorId },
    });
    if (to === "SHIPPED") await t.shipment.updateMany({ where: { orderId }, data: { status: "IN_TRANSIT" } });
    if (to === "DELIVERED" || to === "COMPLETED") await t.shipment.updateMany({ where: { orderId }, data: { status: "DELIVERED" } });
    return { ...order, status: to };
  };
  return tx ? run(tx) : db.$transaction(run);
}

export const orderDetailInclude = {
  items: { include: { product: { select: { slug: true, kind: true } }, usedUnit: { select: { code: true } } } },
  history: { orderBy: { createdAt: "asc" } },
  payments: { orderBy: { createdAt: "desc" } },
  shipment: true,
  promoCode: { select: { code: true } },
} satisfies Prisma.OrderInclude;

/** Заказ доступен владельцу-пользователю или по секретному токену гостя */
export async function getOrderForCustomer(number: string, access: { userId?: string | null; token?: string | null }) {
  const order = await db.order.findUnique({ where: { number }, include: orderDetailInclude });
  if (!order) throw new AppError("NOT_FOUND", "Заказ не найден");
  const byUser = !!access.userId && order.userId === access.userId;
  const byToken = !!access.token && access.token === order.accessToken;
  if (!byUser && !byToken) throw new AppError("NOT_FOUND", "Заказ не найден");
  return order;
}
