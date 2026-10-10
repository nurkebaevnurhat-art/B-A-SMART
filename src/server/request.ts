import { cookies, headers } from "next/headers";
import { getCurrentUser } from "./auth/session";
import { findCart, getOrCreateCart } from "./services/cart";

export const CART_COOKIE = "ba_cart";

/** Токен корзины: cookie для сайта или заголовок X-Cart-Token для мобильного приложения */
export async function readCartToken(): Promise<string | null> {
  const h = (await headers()).get("x-cart-token");
  if (h) return h;
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

export async function setCartCookie(token: string) {
  // В серверных компонентах cookie менять нельзя — там это молча пропускается
  try {
    (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  } catch {
    /* read-only context */
  }
}

export async function currentCart(create = false) {
  const [user, token] = await Promise.all([getCurrentUser(), readCartToken()]);
  const cart = create ? await getOrCreateCart(token, user?.id) : await findCart(token, user?.id);
  if (cart && cart.token !== token) await setCartCookie(cart.token);
  return { cart, user };
}
