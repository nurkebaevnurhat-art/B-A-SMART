import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const [products, units, categories] = await Promise.all([
    db.product.findMany({ where: { status: "PUBLISHED", condition: { not: "USED" } }, select: { slug: true, updatedAt: true } }),
    db.usedUnit.findMany({ where: { status: "AVAILABLE", product: { status: "PUBLISHED" } }, select: { code: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true } }),
  ]);
  const staticPages = ["", "/catalog", "/catalog/accessories", "/used", "/installment", "/info/delivery", "/info/used-check", "/info/returns", "/info/terms", "/info/privacy", "/info/contacts"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 })),
    ...categories.map((c) => ({ url: `${base}/catalog/${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...units.map((u) => ({ url: `${base}/used/${u.code}`, lastModified: u.updatedAt, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
