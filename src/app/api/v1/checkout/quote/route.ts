import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { quoteCart } from "@/server/services/orders";
import { currentCart } from "@/server/request";

const schema = z.object({ deliveryCode: z.string().optional().nullable(), promoCode: z.string().max(40).optional().nullable() });

/** Предварительный расчёт стоимости — только на сервере */
export const POST = handler(async (req) => {
  const input = await parseBody(req, schema);
  const { cart } = await currentCart(false);
  if (!cart) throw new AppError("BAD_REQUEST", "Корзина пуста");
  return quoteCart(cart.id, input);
});
