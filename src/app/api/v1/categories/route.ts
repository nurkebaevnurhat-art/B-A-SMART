import { handler } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = handler(async () => ({
  categories: await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, nameRu: true, nameKk: true, group: true } }),
  brands: await db.brand.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
}));
