import { handler } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { reserveCartUnits } from "@/server/services/cart";
import { getSetting } from "@/server/services/settings";
import { currentCart } from "@/server/request";

/** Бронирование б/у экземпляров на время оформления заказа */
export const POST = handler(async () => {
  const { cart } = await currentCart(false);
  if (!cart || !cart.items.length) throw new AppError("BAD_REQUEST", "Корзина пуста");
  const { reservationMinutes } = await getSetting("checkout");
  const res = await reserveCartUnits(cart.id, reservationMinutes);
  if (res.failed.length) {
    throw new AppError("RESERVED", "Некоторые б/у экземпляры уже забронированы другим покупателем или проданы", { unitIds: res.failed });
  }
  return { reservedUntil: res.reservedUntil, minutes: reservationMinutes };
});
