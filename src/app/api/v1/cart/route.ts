import { handler } from "@/lib/api";
import { toCartView } from "@/server/services/cart";
import { currentCart } from "@/server/request";

/** Текущая корзина. Для мобильного приложения токен передаётся в заголовке X-Cart-Token. */
export const GET = handler(async () => {
  const { cart } = await currentCart(true);
  return toCartView(cart!);
});
