"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "./ui/Toast";
import { useI18n } from "@/lib/i18n/client";

export type SessionUser = { id: string; name: string; isStaff: boolean } | null;

type AddInput = { variantId: string; quantity?: number } | { usedUnitId: string };

type Shop = {
  user: SessionUser;
  cartCount: number;
  setCartCount: (n: number) => void;
  addToCart: (input: AddInput) => Promise<boolean>;
  favorites: Set<string>;
  toggleFavorite: (key: string) => Promise<void>;
  openAccount: () => void;
  accountOpen: boolean;
  setAccountOpen: (v: boolean) => void;
};

const Ctx = createContext<Shop | null>(null);
const LS_KEY = "ba_fav";

function readLocalFavs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function ShopProvider({ user, initialCartCount, initialFavorites, children }: { user: SessionUser; initialCartCount: number; initialFavorites: string[]; children: ReactNode }) {
  const [cartCount, setCartCount] = useState(initialCartCount);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavorites));
  const [accountOpen, setAccountOpen] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => setCartCount(initialCartCount), [initialCartCount]);

  // Гостевое избранное хранится в браузере; после входа переносится в аккаунт
  useEffect(() => {
    const local = readLocalFavs();
    if (!user) {
      setFavorites(new Set(local));
      return;
    }
    setFavorites(new Set(initialFavorites));
    if (local.length) {
      Promise.all(
        local.map((k) => api("/favorites", { method: "POST", body: k.startsWith("u:") ? { usedUnitId: k.slice(2) } : { productId: k.slice(2) } }).catch(() => null)),
      ).then(() => {
        try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
        setFavorites((s) => new Set([...s, ...local]));
      });
    }
  }, [user, initialFavorites]);

  const addToCart = useCallback(
    async (input: AddInput) => {
      try {
        const cart = await api<{ count: number }>("/cart/items", { method: "POST", body: input });
        setCartCount(cart.count);
        toast({ tone: "ok", text: t.cart.added, action: { label: t.cart.goToCart, href: "/cart" } });
        router.refresh();
        return true;
      } catch (e) {
        toast({ tone: "error", text: e instanceof ApiError ? e.message : t.common.error });
        return false;
      }
    },
    [toast, router, t],
  );

  const toggleFavorite = useCallback(
    async (key: string) => {
      const has = favorites.has(key);
      const next = new Set(favorites);
      if (has) next.delete(key);
      else next.add(key);
      setFavorites(next);
      if (!user) {
        try { localStorage.setItem(LS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
        return;
      }
      const body = key.startsWith("u:") ? { usedUnitId: key.slice(2) } : { productId: key.slice(2) };
      try {
        await api("/favorites", { method: has ? "DELETE" : "POST", body });
      } catch (e) {
        setFavorites(favorites);
        toast({ tone: "error", text: e instanceof ApiError ? e.message : t.common.error });
      }
    },
    [favorites, user, toast, t],
  );

  const value = useMemo(
    () => ({ user, cartCount, setCartCount, addToCart, favorites, toggleFavorite, openAccount: () => setAccountOpen(true), accountOpen, setAccountOpen }),
    [user, cartCount, addToCart, favorites, toggleFavorite, accountOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const c = useContext(Ctx);
  if (!c) throw new Error("ShopProvider missing");
  return c;
}
