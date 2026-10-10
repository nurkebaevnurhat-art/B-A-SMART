import { handler, parseBody } from "@/lib/api";
import { addItem, addItemSchema, reloadCart, toCartView } from "@/server/services/cart";
import { currentCart } from "@/server/request";

export const POST = handler(async (req) => {
  const input = await parseBody(req, addItemSchema);
  const { cart } = await currentCart(true);
  await addItem(cart!.id, input);
  return toCartView(await reloadCart(cart!.id));
});
