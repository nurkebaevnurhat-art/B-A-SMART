import { handler, parseBody } from "@/lib/api";
import { authenticate, checkRate, loginSchema, resetRate } from "@/server/services/auth";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { mergeGuestCart } from "@/server/services/cart";
import { readCartToken, setCartCookie } from "@/server/request";

/** Вход. Веб получает httpOnly cookie, мобильное приложение — token для заголовка Authorization: Bearer. */
export const POST = handler(async (req) => {
  const input = await parseBody(req, loginSchema);
  const key = `login:${input.login.toLowerCase()}`;
  checkRate(key);
  const user = await authenticate(input);
  resetRate(key);
  const session = await createSession(user.id, req.headers.get("user-agent"));
  await setSessionCookie(session.token, session.expiresAt);
  const cart = await mergeGuestCart(await readCartToken(), user.id);
  await setCartCookie(cart.token);
  return { user: { id: user.id, name: user.name, role: user.role.key }, token: session.token, expiresAt: session.expiresAt, cartToken: cart.token };
});
