import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { reloadCart, removeItem, setItemQuantity, toCartView } from "@/server/services/cart";
import { currentCart } from "@/server/request";

async function cartOrThrow() {
  const { cart } = await currentCart(false);
  if (!cart) throw new AppError("NOT_FOUND", "Корзина не найдена");
  return cart;
}

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const { quantity } = await parseBody(req, z.object({ quantity: z.number().int().min(0).max(99) }));
  const cart = await cartOrThrow();
  await setItemQuantity(cart.id, id, quantity);
  return toCartView(await reloadCart(cart.id));
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  const cart = await cartOrThrow();
  await removeItem(cart.id, id);
  return toCartView(await reloadCart(cart.id));
});
