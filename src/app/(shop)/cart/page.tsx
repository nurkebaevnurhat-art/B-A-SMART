import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { toCartView } from "@/server/services/cart";
import { currentCart } from "@/server/request";
import { CartClient } from "@/components/cart/CartClient";

export const metadata: Metadata = { title: "Корзина", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { t } = await getDict();
  const { cart } = await currentCart(false);
  const view = cart ? toCartView(cart) : { id: "", token: "", lines: [], count: 0, subtotal: 0, hasProblems: false };
  return (
    <div className="container pb-20 pt-8 md:pt-12">
      <h1 className="mb-8 font-display text-3xl font-semibold md:text-[42px]">{t.cart.title}</h1>
      <CartClient initial={view} />
    </div>
  );
}
