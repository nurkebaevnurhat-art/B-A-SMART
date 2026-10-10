import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getDict, pick } from "@/lib/i18n/server";
import { quoteCart } from "@/server/services/orders";
import { getSetting } from "@/server/services/settings";
import { paymentsAreTest } from "@/server/services/payments";
import { currentCart } from "@/server/request";
import { getShell } from "@/server/layout-data";
import { CheckoutClient } from "@/components/cart/CheckoutClient";

export const metadata: Metadata = { title: "Оформление заказа", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { locale, t } = await getDict();
  const { cart, user } = await currentCart(false);
  if (!cart || !cart.items.length) redirect("/cart");
  const [options, checkout, shell] = await Promise.all([
    db.deliveryOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getSetting("checkout"),
    getShell(locale),
  ]);
  const quote = await quoteCart(cart.id, { deliveryCode: options[0]?.code });
  return (
    <div className="container pb-20 pt-8 md:pt-12">
      <h1 className="mb-8 font-display text-3xl font-semibold md:text-[42px]">{t.checkout.title}</h1>
      <CheckoutClient
        initialQuote={quote}
        deliveryOptions={options.map((o) => ({ code: o.code, name: pick(locale, o.nameRu, o.nameKk), description: o.description, price: o.price, freeFrom: o.freeFrom, needsAddress: o.needsAddress }))}
        cities={shell.store.cities}
        defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "", city: user?.city ?? shell.city, address: user?.address ?? "" }}
        payments={{ cash: checkout.cashOnDeliveryEnabled, online: checkout.onlinePaymentEnabled, testMode: paymentsAreTest() }}
        hasUnits={cart.items.some((i) => i.usedUnitId)}
      />
    </div>
  );
}
