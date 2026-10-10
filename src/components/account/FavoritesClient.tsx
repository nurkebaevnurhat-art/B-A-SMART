"use client";
import { useEffect, useState } from "react";
import type { OfferCard } from "@/server/services/catalog";
import { useShop } from "../ShopProvider";
import { ProductGrid } from "../product/ProductCard";
import { ButtonLink } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { api } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

export function FavoritesClient() {
  const { t } = useI18n();
  const { favorites, user, openAccount } = useShop();
  const [items, setItems] = useState<OfferCard[] | null>(null);
  const keys = [...favorites].sort().join(",");

  useEffect(() => {
    const list = keys ? keys.split(",") : [];
    if (!list.length) {
      setItems([]);
      return;
    }
    api<OfferCard[]>("/cards", { method: "POST", body: { keys: list } })
      .then(setItems)
      .catch(() => setItems([]));
  }, [keys]);

  if (items === null) return <p className="text-muted">{t.common.loading}</p>;
  return (
    <>
      {!user && items.length > 0 && (
        <p className="mb-8 rounded-2xl bg-surface p-4 text-sm text-graphite">
          Избранное сохранено в этом браузере. <button onClick={openAccount} className="link font-medium text-ink">Войдите</button>, чтобы оно было доступно на всех устройствах.
        </p>
      )}
      {items.length ? (
        <ProductGrid items={items} />
      ) : (
        <div className="rounded-3xl bg-surface px-6 py-16 text-center">
          <Icon name="heart" size={36} className="mx-auto text-muted" />
          <p className="mt-4 text-graphite">Здесь появятся товары, которые вы отметите сердечком.</p>
          <ButtonLink href="/catalog/smartphones" className="mt-6">{t.cart.toCatalog}</ButtonLink>
        </div>
      )}
    </>
  );
}
