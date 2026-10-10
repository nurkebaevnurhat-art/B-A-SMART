import { handler, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { checkoutSchema, createOrder } from "@/server/services/orders";
import { requireUser } from "@/server/auth/session";
import { currentCart } from "@/server/request";

/** Мои заказы */
export const GET = handler(async () => {
  const user = await requireUser();
  return db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { number: true, status: true, total: true, createdAt: true, paymentMethod: true, items: { select: { name: true, quantity: true } } },
  });
});

/** Создание заказа из корзины. Цены, наличие и скидки пересчитываются сервером. */
export const POST = handler(async (req) => {
  const input = await parseBody(req, checkoutSchema);
  const { cart, user } = await currentCart(false);
  if (!cart) throw new AppError("BAD_REQUEST", "Корзина пуста");
  const order = await createOrder(cart.id, input, user?.id ?? null);
  return { number: order.number, status: order.status, total: order.total, accessToken: order.accessToken, paymentMethod: order.paymentMethod };
});
