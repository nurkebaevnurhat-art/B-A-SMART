import { handler, parseBody } from "@/lib/api";
import { checkRate, registerSchema, registerUser } from "@/server/services/auth";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { mergeGuestCart } from "@/server/services/cart";
import { readCartToken, setCartCookie } from "@/server/request";

export const POST = handler(async (req) => {
  checkRate(`reg:${req.headers.get("x-forwarded-for") ?? "local"}`, 10, 60 * 60_000);
  const input = await parseBody(req, registerSchema);
  const user = await registerUser(input);
  const session = await createSession(user.id, req.headers.get("user-agent"));
  await setSessionCookie(session.token, session.expiresAt);
  const cart = await mergeGuestCart(await readCartToken(), user.id);
  await setCartCookie(cart.token);
  return { user: { id: user.id, name: user.name }, token: session.token, expiresAt: session.expiresAt, cartToken: cart.token };
});
