import { z } from "zod";
import { db } from "@/lib/db";
import { hydrateCards } from "./catalog";

export const favoriteSchema = z.union([z.object({ productId: z.string().min(1) }), z.object({ usedUnitId: z.string().min(1) })]);

export async function listFavorites(userId: string) {
  const rows = await db.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const refs = rows.map((r) => (r.usedUnitId ? { type: "unit" as const, id: r.usedUnitId } : { type: "product" as const, id: r.productId! }));
  return hydrateCards(refs);
}

export async function favoriteKeys(userId: string): Promise<string[]> {
  const rows = await db.favorite.findMany({ where: { userId }, select: { productId: true, usedUnitId: true } });
  return rows.map((r) => (r.usedUnitId ? `u:${r.usedUnitId}` : `p:${r.productId}`));
}

export async function addFavorite(userId: string, input: z.infer<typeof favoriteSchema>) {
  if ("productId" in input) {
    await db.favorite.upsert({
      where: { userId_productId: { userId, productId: input.productId } },
      create: { userId, productId: input.productId },
      update: {},
    });
  } else {
    await db.favorite.upsert({
      where: { userId_usedUnitId: { userId, usedUnitId: input.usedUnitId } },
      create: { userId, usedUnitId: input.usedUnitId },
      update: {},
    });
  }
}

export async function removeFavorite(userId: string, input: z.infer<typeof favoriteSchema>) {
  await db.favorite.deleteMany({ where: { userId, ...("productId" in input ? { productId: input.productId } : { usedUnitId: input.usedUnitId }) } });
}
