import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { FavoritesClient } from "@/components/account/FavoritesClient";

export const metadata: Metadata = { title: "Избранное", robots: { index: false } };

export default async function FavoritesPage() {
  const { t } = await getDict();
  return (
    <div className="container pb-20 pt-8 md:pt-12">
      <h1 className="mb-8 font-display text-3xl font-semibold md:text-[42px]">{t.common.favorites}</h1>
      <FavoritesClient />
    </div>
  );
}
