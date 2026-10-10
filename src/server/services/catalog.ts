import { z } from "zod";
import type { Prisma, ProductCondition, ProductKind, UsedGrade } from "@prisma/client";
import { db } from "@/lib/db";

/** Виртуальные группы каталога (помимо обычных категорий) */
export const CATALOG_GROUPS = {
  all: { ru: "Каталог", kk: "Каталог" },
  accessories: { ru: "Аксессуары", kk: "Аксессуарлар" },
} as const;

const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(","))).map((s) => s.trim()).filter(Boolean));

const boolish = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => v === true || v === "1" || v === "true");

export const catalogQuerySchema = z.object({
  category: z.string().max(60).optional(), // slug категории или группы ("accessories", "all")
  q: z.string().max(100).optional(),
  brand: csv,
  condition: csv.pipe(z.array(z.enum(["NEW", "USED", "REFURBISHED"]))),
  grade: csv.pipe(z.array(z.enum(["EXCELLENT", "GOOD", "FAIR"]))),
  storage: csv.pipe(z.array(z.coerce.number().int().positive())),
  color: csv,
  compat: z.string().max(60).optional(),
  model: z.string().max(80).optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  inStock: boolish,
  installment: boolish,
  sort: z.enum(["new", "price_asc", "price_desc", "popular"]).optional().default("new"),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(60).optional().default(24),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export function parseCatalogQuery(input: Record<string, string | string[] | undefined>): CatalogQuery {
  const r = catalogQuerySchema.safeParse(input);
  return r.success ? r.data : catalogQuerySchema.parse({});
}

export type CardVariant = {
  id: string;
  color: string | null;
  colorHex: string | null;
  storageGb: number | null;
  price: number;
  oldPrice: number | null;
  stock: number;
};

export type OfferCard = {
  type: "product" | "unit";
  id: string;
  productId: string;
  href: string;
  name: string;
  brand: string;
  kind: ProductKind;
  category: string;
  condition: ProductCondition;
  image: { url: string; alt: string } | null;
  colorHex: string | null;
  colors: { name: string; hex: string | null }[];
  storages: number[];
  price: number;
  oldPrice: number | null;
  inStock: boolean;
  isNewArrival: boolean;
  installmentAvailable: boolean;
  variants: CardVariant[];
  grade?: UsedGrade;
  batteryHealth?: number | null;
  code?: string;
  createdAt: string;
};

const textSearch = (q: string): Prisma.ProductWhereInput => {
  const words = q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return {
    AND: words.map((w) => ({
      OR: [
        { name: { contains: w, mode: "insensitive" } },
        { model: { contains: w, mode: "insensitive" } },
        { brand: { name: { contains: w, mode: "insensitive" } } },
      ],
    })),
  };
};

async function categoryFilter(slug?: string): Promise<Prisma.ProductWhereInput> {
  if (!slug || slug === "all") return {};
  if (slug === "accessories") return { category: { group: "accessories" } };
  return { category: { slug } };
}

/** Общая часть фильтра для товаров (модель), без условий на варианты */
async function baseProductWhere(q: CatalogQuery): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [{ status: "PUBLISHED" }, await categoryFilter(q.category)];
  if (q.q) and.push(textSearch(q.q));
  if (q.brand.length) and.push({ brand: { slug: { in: q.brand } } });
  if (q.compat) and.push({ compatibleWith: { some: { modelKey: q.compat } } });
  if (q.model) and.push({ modelKey: q.model });
  if (q.installment) and.push({ installmentAvailable: true });
  return { AND: and };
}

type Ranked = { type: "product" | "unit"; id: string; price: number; createdAt: Date; popularity: number };

export async function listCatalog(q: CatalogQuery) {
  const base = await baseProductWhere(q);
  const wantConditions = q.condition.length ? q.condition : (["NEW", "USED", "REFURBISHED"] as ProductCondition[]);
  const wantStock = wantConditions.filter((c) => c !== "USED");
  const wantUnits = wantConditions.includes("USED");

  const ranked: Ranked[] = [];

  // 1) Новые и восстановленные — карточка на модель, цена = минимальная из подходящих вариантов
  if (wantStock.length && !q.grade.length) {
    const variantWhere: Prisma.ProductVariantWhereInput = {
      isActive: true,
      ...(q.storage.length ? { storageGb: { in: q.storage } } : {}),
      ...(q.color.length ? { color: { in: q.color, mode: "insensitive" } } : {}),
      ...(q.inStock ? { stock: { gt: 0 } } : {}),
      ...(q.priceMin !== undefined || q.priceMax !== undefined
        ? { price: { ...(q.priceMin !== undefined ? { gte: q.priceMin } : {}), ...(q.priceMax !== undefined ? { lte: q.priceMax } : {}) } }
        : {}),
    };
    const rows = await db.product.findMany({
      where: { AND: [base, { condition: { in: wantStock } }, { variants: { some: variantWhere } }] },
      select: {
        id: true,
        publishedAt: true,
        createdAt: true,
        salesCount: true,
        variants: { where: variantWhere, select: { price: true, stock: true } },
      },
    });
    for (const r of rows) {
      const inStock = r.variants.filter((v) => v.stock > 0);
      const pool = inStock.length ? inStock : r.variants;
      ranked.push({
        type: "product",
        id: r.id,
        price: Math.min(...pool.map((v) => v.price)),
        createdAt: r.publishedAt ?? r.createdAt,
        popularity: r.salesCount,
      });
    }
  }

  // 2) Б/у — каждый экземпляр отдельной карточкой
  if (wantUnits) {
    const now = new Date();
    const unitWhere: Prisma.UsedUnitWhereInput = {
      product: { AND: [base, { condition: "USED" }] },
      OR: [{ status: "AVAILABLE" }, ...(q.inStock ? [] : [{ status: "RESERVED" as const }])],
      ...(q.grade.length ? { grade: { in: q.grade } } : {}),
      ...(q.storage.length ? { storageGb: { in: q.storage } } : {}),
      ...(q.color.length ? { color: { in: q.color, mode: "insensitive" } } : {}),
      ...(q.priceMin !== undefined || q.priceMax !== undefined
        ? { price: { ...(q.priceMin !== undefined ? { gte: q.priceMin } : {}), ...(q.priceMax !== undefined ? { lte: q.priceMax } : {}) } }
        : {}),
    };
    // Истёкшие резервы считаем доступными
    if (q.inStock) {
      unitWhere.OR = [{ status: "AVAILABLE" }, { status: "RESERVED", reservedUntil: { lt: now } }];
    }
    const units = await db.usedUnit.findMany({
      where: unitWhere,
      select: { id: true, price: true, createdAt: true },
    });
    for (const u of units) ranked.push({ type: "unit", id: u.id, price: u.price, createdAt: u.createdAt, popularity: 0 });
  }

  ranked.sort((a, b) => {
    switch (q.sort) {
      case "price_asc":
        return a.price - b.price || b.createdAt.getTime() - a.createdAt.getTime();
      case "price_desc":
        return b.price - a.price || b.createdAt.getTime() - a.createdAt.getTime();
      case "popular":
        return b.popularity - a.popularity || b.createdAt.getTime() - a.createdAt.getTime();
      default:
        return b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id);
    }
  });

  const total = ranked.length;
  const pages = Math.max(1, Math.ceil(total / q.perPage));
  const page = Math.min(q.page, pages);
  const slice = ranked.slice((page - 1) * q.perPage, page * q.perPage);
  const items = await hydrateCards(slice.map(({ type, id }) => ({ type, id })), q);

  return { items, total, page, pages, perPage: q.perPage };
}

export const productCardInclude = {
  brand: { select: { name: true } },
  category: { select: { slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
  variants: {
    where: { isActive: true },
    orderBy: [{ price: "asc" }],
    select: { id: true, color: true, colorHex: true, storageGb: true, price: true, oldPrice: true, stock: true },
  },
} satisfies Prisma.ProductInclude;

const unitCardInclude = {
  product: {
    select: { id: true, name: true, kind: true, installmentAvailable: true, brand: { select: { name: true } }, category: { select: { slug: true } } },
  },
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
} satisfies Prisma.UsedUnitInclude;

type ProductWithCard = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;
type UnitWithCard = Prisma.UsedUnitGetPayload<{ include: typeof unitCardInclude }>;

export function productToCard(p: ProductWithCard, q?: Partial<CatalogQuery>): OfferCard {
  let pool = p.variants;
  if (q?.storage?.length) pool = pool.filter((v) => v.storageGb && q.storage!.includes(v.storageGb));
  if (q?.color?.length) pool = pool.filter((v) => v.color && q.color!.some((c) => c.toLowerCase() === v.color!.toLowerCase()));
  if (q?.priceMin !== undefined) pool = pool.filter((v) => v.price >= q.priceMin!);
  if (q?.priceMax !== undefined) pool = pool.filter((v) => v.price <= q.priceMax!);
  if (q?.inStock) pool = pool.filter((v) => v.stock > 0);
  if (!pool.length) pool = p.variants;
  const inStock = pool.filter((v) => v.stock > 0);
  const best = [...(inStock.length ? inStock : pool)].sort((a, b) => a.price - b.price)[0];
  const colors = new Map<string, string | null>();
  for (const v of p.variants) if (v.color && !colors.has(v.color)) colors.set(v.color, v.colorHex);
  const storages = [...new Set(p.variants.map((v) => v.storageGb).filter((x): x is number => !!x))].sort((a, b) => a - b);
  return {
    type: "product",
    id: p.id,
    productId: p.id,
    href: `/product/${p.slug}`,
    name: p.name,
    brand: p.brand.name,
    kind: p.kind,
    category: p.category.slug,
    condition: p.condition,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt ?? p.name } : null,
    colorHex: best?.colorHex ?? null,
    colors: [...colors].map(([name, hex]) => ({ name, hex })),
    storages,
    price: best?.price ?? 0,
    oldPrice: best?.oldPrice ?? null,
    inStock: p.variants.some((v) => v.stock > 0),
    isNewArrival: p.isNewArrival,
    installmentAvailable: p.installmentAvailable,
    variants: p.variants,
    createdAt: (p.publishedAt ?? p.createdAt).toISOString(),
  };
}

export function unitToCard(u: UnitWithCard): OfferCard {
  const available = u.status === "AVAILABLE" || (u.status === "RESERVED" && !!u.reservedUntil && u.reservedUntil < new Date());
  return {
    type: "unit",
    id: u.id,
    productId: u.productId,
    href: `/used/${u.code}`,
    name: u.product.name,
    brand: u.product.brand.name,
    kind: u.product.kind,
    category: u.product.category.slug,
    condition: "USED",
    image: u.images[0] ? { url: u.images[0].url, alt: u.images[0].alt ?? u.product.name } : null,
    colorHex: u.colorHex,
    colors: u.color ? [{ name: u.color, hex: u.colorHex }] : [],
    storages: u.storageGb ? [u.storageGb] : [],
    price: u.price,
    oldPrice: u.oldPrice,
    inStock: available,
    isNewArrival: false,
    installmentAvailable: u.product.installmentAvailable,
    variants: [],
    grade: u.grade,
    batteryHealth: u.batteryHealth,
    code: u.code,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function hydrateCards(refs: { type: "product" | "unit"; id: string }[], q?: Partial<CatalogQuery>): Promise<OfferCard[]> {
  const pIds = refs.filter((r) => r.type === "product").map((r) => r.id);
  const uIds = refs.filter((r) => r.type === "unit").map((r) => r.id);
  const [products, units] = await Promise.all([
    pIds.length ? db.product.findMany({ where: { id: { in: pIds } }, include: productCardInclude }) : [],
    uIds.length ? db.usedUnit.findMany({ where: { id: { in: uIds } }, include: unitCardInclude }) : [],
  ]);
  const pMap = new Map(products.map((p) => [p.id, productToCard(p, q)]));
  const uMap = new Map(units.map((u) => [u.id, unitToCard(u)]));
  return refs.map((r) => (r.type === "product" ? pMap.get(r.id) : uMap.get(r.id))).filter((x): x is OfferCard => !!x);
}

/** Значения для фильтров с учётом категории/состояния/поиска */
export async function catalogFacets(q: CatalogQuery) {
  const base = await baseProductWhere({ ...q, brand: [] });
  const conditions = q.condition.length ? q.condition : (["NEW", "USED", "REFURBISHED"] as ProductCondition[]);
  const productWhere: Prisma.ProductWhereInput = { AND: [base, { condition: { in: conditions } }] };

  const [brands, variants, units, compat] = await Promise.all([
    db.brand.findMany({
      where: { products: { some: productWhere } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true },
    }),
    db.productVariant.findMany({
      where: { isActive: true, product: { AND: [productWhere, { condition: { not: "USED" } }] } },
      select: { storageGb: true, color: true, colorHex: true, price: true },
    }),
    conditions.includes("USED")
      ? db.usedUnit.findMany({
          where: { status: { in: ["AVAILABLE", "RESERVED"] }, product: { AND: [productWhere, { condition: "USED" }] } },
          select: { storageGb: true, color: true, colorHex: true, price: true },
        })
      : [],
    db.accessoryCompatibility.findMany({
      where: { accessory: productWhere },
      distinct: ["modelKey"],
      select: { modelKey: true },
    }),
  ]);
  const all = [...variants, ...units];
  const storages = [...new Set(all.map((v) => v.storageGb).filter((x): x is number => !!x))].sort((a, b) => a - b);
  const colorMap = new Map<string, string | null>();
  for (const v of all) if (v.color && !colorMap.has(v.color)) colorMap.set(v.color, v.colorHex);
  const prices = all.map((v) => v.price);
  const compatKeys = compat.map((c) => c.modelKey);
  const compatModels = compatKeys.length
    ? await db.product.findMany({
        where: { modelKey: { in: compatKeys }, kind: { in: ["SMARTPHONE", "TABLET", "WATCH"] } },
        distinct: ["modelKey"],
        select: { modelKey: true, model: true },
        orderBy: { model: "asc" },
      })
    : [];
  return {
    brands,
    storages,
    colors: [...colorMap].map(([name, hex]) => ({ name, hex })),
    price: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    compat: compatKeys
      .map((k) => ({ key: k, label: compatModels.find((m) => m.modelKey === k)?.model ?? k }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export async function getCategories() {
  return db.category.findMany({ orderBy: [{ group: "desc" }, { sortOrder: "asc" }] });
}

/** Подборки для главной страницы */
export async function getProductCollection(
  kind: "popular" | "newArrivals" | "new" | "featured" | "accessories" | "refurbished",
  take = 8,
): Promise<OfferCard[]> {
  const where: Prisma.ProductWhereInput = { status: "PUBLISHED", variants: { some: { isActive: true } } };
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ publishedAt: "desc" }];
  switch (kind) {
    case "popular":
      Object.assign(where, { kind: { in: ["SMARTPHONE", "TABLET"] }, condition: { not: "USED" }, salesCount: { gt: 0 } });
      orderBy = [{ salesCount: "desc" }, { publishedAt: "desc" }];
      break;
    case "newArrivals":
      Object.assign(where, { isNewArrival: true, condition: "NEW" });
      break;
    case "new":
      Object.assign(where, { kind: "SMARTPHONE", condition: "NEW" });
      break;
    case "refurbished":
      Object.assign(where, { condition: "REFURBISHED" });
      break;
    case "featured":
      Object.assign(where, { isFeatured: true, condition: { not: "USED" } });
      break;
    case "accessories":
      Object.assign(where, { category: { group: "accessories" } });
      break;
  }
  const rows = await db.product.findMany({ where, orderBy, take, include: productCardInclude });
  return rows.map((p) => productToCard(p));
}

export async function getUsedCollection(take = 8): Promise<OfferCard[]> {
  const units = await db.usedUnit.findMany({
    where: { status: "AVAILABLE", product: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    take,
    include: unitCardInclude,
  });
  return units.map(unitToCard);
}

export async function searchSuggestions(q: string, take = 6) {
  if (q.trim().length < 2) return [];
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED", condition: { not: "USED" }, ...textSearch(q) },
    orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
    take,
    include: productCardInclude,
  });
  return rows.map((p) => productToCard(p));
}
