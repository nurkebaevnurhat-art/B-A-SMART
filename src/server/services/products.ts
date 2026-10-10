import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { hydrateCards, productCardInclude as cardInclude, productToCard, unitToCard, type OfferCard } from "./catalog";

export type SpecGroup = { group: string; items: { label: string; value: string }[] };

export function parseSpecs(value: Prisma.JsonValue): SpecGroup[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((g): g is Prisma.JsonObject => !!g && typeof g === "object" && !Array.isArray(g))
    .map((g) => ({
      group: String(g.group ?? ""),
      items: Array.isArray(g.items)
        ? (g.items as Prisma.JsonObject[])
            .filter((i) => i && typeof i === "object")
            .map((i) => ({ label: String(i.label ?? ""), value: String(i.value ?? "") }))
            .filter((i) => i.label && i.value)
        : [],
    }))
    .filter((g) => g.items.length);
}

export async function getProductBySlug(slug: string, opts: { includeDrafts?: boolean } = {}) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: [{ storageGb: "asc" }, { price: "asc" }] },
      compatibleWith: { select: { modelKey: true } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!product || (!opts.includeDrafts && product.status !== "PUBLISHED")) throw notFound("Товар");
  return { ...product, specs: parseSpecs(product.specs) };
}

export type ProductDetail = Awaited<ReturnType<typeof getProductBySlug>>;


/** Совместимые аксессуары — строго по данным каталога (таблица совместимости). */
export async function getCompatibleAccessories(modelKey: string | null, take = 8): Promise<OfferCard[]> {
  if (!modelKey) return [];
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED", compatibleWith: { some: { modelKey } }, variants: { some: { isActive: true } } },
    orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
    take,
    include: cardInclude,
  });
  return rows.map((p) => productToCard(p));
}

/** Модели, с которыми совместим аксессуар */
export async function getCompatibleModels(modelKeys: string[]) {
  if (!modelKeys.length) return [];
  const rows = await db.product.findMany({
    where: { modelKey: { in: modelKeys }, kind: { in: ["SMARTPHONE", "TABLET", "WATCH"] } },
    distinct: ["modelKey"],
    select: { modelKey: true, model: true, brand: { select: { name: true } } },
  });
  return modelKeys.map((k) => {
    const r = rows.find((x) => x.modelKey === k);
    return { key: k, label: r ? `${r.brand.name} ${r.model}` : k };
  });
}

export async function getSimilarProducts(p: { id: string; categoryId: string; kind: string; condition: string }, price: number, take = 8) {
  const rows = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: p.id },
      categoryId: p.categoryId,
      condition: { not: "USED" },
      variants: { some: { isActive: true, price: { gte: Math.round(price * 0.6), lte: Math.round(price * 1.5) } } },
    },
    orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
    take,
    include: cardInclude,
  });
  return rows.map((x) => productToCard(x));
}

/** Б/у экземпляры той же модели */
export async function getUsedUnitsOfModel(modelKey: string | null, excludeUnitId?: string, take = 8): Promise<OfferCard[]> {
  if (!modelKey) return [];
  const units = await db.usedUnit.findMany({
    where: { status: "AVAILABLE", id: excludeUnitId ? { not: excludeUnitId } : undefined, product: { modelKey, status: "PUBLISHED" } },
    orderBy: { price: "asc" },
    take,
    select: { id: true },
  });
  return hydrateCards(units.map((u) => ({ type: "unit" as const, id: u.id })));
}

export async function getUsedUnitByCode(code: string, opts: { includeDrafts?: boolean } = {}) {
  const unit = await db.usedUnit.findUnique({
    where: { code },
    include: {
      product: { include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" } } } },
      images: { orderBy: { sortOrder: "asc" } },
      inspection: true,
    },
  });
  if (!unit) throw notFound("Экземпляр");
  if (!opts.includeDrafts && (unit.status === "DRAFT" || unit.status === "ARCHIVED" || unit.product.status !== "PUBLISHED")) {
    throw notFound("Экземпляр");
  }
  const reservedActive = unit.status === "RESERVED" && !!unit.reservedUntil && unit.reservedUntil > new Date();
  return {
    ...unit,
    available: unit.status === "AVAILABLE" || (unit.status === "RESERVED" && !reservedActive),
    reservedActive,
    specs: parseSpecs(unit.product.specs),
    checks: parseChecks(unit.inspection?.checks ?? []),
  };
}

export type InspectionCheck = { key: string; label: string; result: "PASS" | "FAIL" | "NOT_TESTED"; note?: string };

export function parseChecks(value: Prisma.JsonValue): InspectionCheck[] {
  if (!Array.isArray(value)) return [];
  return (value as Prisma.JsonObject[])
    .filter((c) => c && typeof c === "object")
    .map((c) => ({
      key: String(c.key ?? ""),
      label: String(c.label ?? ""),
      result: (["PASS", "FAIL", "NOT_TESTED"].includes(String(c.result)) ? c.result : "NOT_TESTED") as InspectionCheck["result"],
      note: c.note ? String(c.note) : undefined,
    }))
    .filter((c) => c.label);
}

/** Стандартный перечень проверок б/у устройства */
export const DEFAULT_CHECKS: { key: string; label: string }[] = [
  { key: "display", label: "Дисплей и сенсор" },
  { key: "faceid", label: "Face ID / отпечаток пальца" },
  { key: "cameras", label: "Основная и фронтальная камеры" },
  { key: "speakers", label: "Динамики и микрофоны" },
  { key: "charging", label: "Зарядка (проводная/беспроводная)" },
  { key: "cellular", label: "Сотовая связь и SIM" },
  { key: "wifi_bt", label: "Wi-Fi и Bluetooth" },
  { key: "buttons", label: "Кнопки и вибромотор" },
  { key: "sensors", label: "Датчики (гироскоп, приближение, освещённость)" },
  { key: "battery", label: "Аккумулятор" },
  { key: "icloud_frp", label: "Отвязка от аккаунтов (iCloud / Google FRP)" },
];

export { unitToCard };
