import { handler } from "@/lib/api";
import { getOrderForCustomer } from "@/server/services/orders";
import { getCurrentUser } from "@/server/auth/session";

/** Заказ: владельцу-пользователю или гостю по токену (?token=) */
export const GET = handler<{ number: string }>(async (req, { number }) => {
  const user = await getCurrentUser();
  const order = await getOrderForCustomer(number, { userId: user?.id, token: req.nextUrl.searchParams.get("token") });
  const { accessToken: _t, ...rest } = order;
  void _t;
  return rest;
});
