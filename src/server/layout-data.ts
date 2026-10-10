import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { pick } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/dict";
import { getSetting } from "./services/settings";
import { favoriteKeys } from "./services/favorites";
import { hasPermission } from "./auth/permissions";
import { getCurrentUser } from "./auth/session";
import { findCart } from "./services/cart";
import { readCartToken } from "./request";

export const getShell = cache(async (locale: Locale) => {
  const [store, topbar, categories, brands, delivery] = await Promise.all([
    getSetting("store"),
    getSetting("topbar"),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }] }),
    db.brand.findMany({
      where: { products: { some: { status: "PUBLISHED", kind: "SMARTPHONE" } } },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    db.deliveryOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  // Полоса сверху: сообщения из настроек + реальные условия доставки из БД
  const items = topbar.items.map((i) => ({ text: pick(locale, i.ru, i.kk), href: i.href || undefined }));
  for (const d of delivery) {
    if (d.freeFrom !== null && d.price > 0) {
      items.push({
        text: locale === "kk" ? `${d.nameKk}: ${formatPrice(d.freeFrom)} бастап тегін` : `${d.nameRu} — бесплатно от ${formatPrice(d.freeFrom)}`,
        href: "/info/delivery",
      });
    } else if (d.price === 0) {
      items.push({ text: locale === "kk" ? `${d.nameKk} — тегін` : `${d.nameRu} — бесплатно`, href: "/info/delivery" });
    }
  }
  const city = decodeURIComponent((await cookies()).get("city")?.value ?? "") || store.city;
  return {
    store,
    city: store.cities.includes(city) ? city : store.city,
    topbarItems: items,
    categories: categories.map((c) => ({ slug: c.slug, name: pick(locale, c.nameRu, c.nameKk), group: c.group })),
    brands,
  };
});

export const getSessionShell = cache(async () => {
  const user = await getCurrentUser();
  const cart = await findCart(await readCartToken(), user?.id);
  const count = cart ? cart.items.reduce((s, i) => s + i.quantity, 0) : 0;
  return {
    user: user ? { id: user.id, name: user.name, isStaff: hasPermission(user, "admin.access") } : null,
    rawUser: user,
    cartCount: count,
    favorites: user ? await favoriteKeys(user.id) : [],
  };
});
