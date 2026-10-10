"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/format";
import { type ActionState, adminAction, checkbox } from "@/server/admin/action";
import { textToSpecs } from "@/server/admin/specs";
import { storeImage } from "@/server/admin/media";
import { audit } from "@/server/services/audit";

const optStr = z.string().max(5000).optional();
const optInt = z.coerce.number().int().min(0).optional();

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "обязательно").max(200),
  slug: z.string().max(200).optional(),
  model: z.string().min(1, "обязательно").max(120),
  modelKey: z.string().max(80).optional(),
  brandId: z.string().min(1, "выберите бренд"),
  categoryId: z.string().min(1, "выберите категорию"),
  kind: z.enum(["SMARTPHONE", "TABLET", "WATCH", "HEADPHONES", "ACCESSORY"]),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]),
  description: optStr,
  descriptionKk: optStr,
  equipment: optStr,
  warranty: optStr,
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(300).optional(),
  specsText: z.string().max(20000).optional(),
  compat: z.string().max(2000).optional(),
  isNewArrival: z.any().transform(checkbox),
  isFeatured: z.any().transform(checkbox),
  installmentAvailable: z.any().transform(checkbox),
});

const _saveProduct = adminAction(
  "products.write",
  productSchema,
  async (d, user) => {
    const data = {
      name: d.name,
      slug: slugify(d.slug || d.name),
      model: d.model,
      modelKey: d.modelKey ? slugify(d.modelKey) : null,
      brandId: d.brandId,
      categoryId: d.categoryId,
      kind: d.kind,
      condition: d.condition,
      description: d.description ?? "",
      descriptionKk: d.descriptionKk ?? null,
      equipment: d.equipment ?? null,
      warranty: d.warranty ?? null,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
      specs: textToSpecs(d.specsText ?? ""),
      isNewArrival: d.isNewArrival,
      isFeatured: d.isFeatured,
      installmentAvailable: d.installmentAvailable,
    };
    const compat = [...new Set((d.compat ?? "").split(/[,\s]+/).map((s) => slugify(s)).filter(Boolean))];
    const product = await db.$transaction(async (tx) => {
      const p = d.id ? await tx.product.update({ where: { id: d.id }, data }) : await tx.product.create({ data: { ...data, status: "DRAFT" } });
      await tx.accessoryCompatibility.deleteMany({ where: { accessoryId: p.id } });
      if (compat.length) await tx.accessoryCompatibility.createMany({ data: compat.map((modelKey) => ({ accessoryId: p.id, modelKey })) });
      return p;
    });
    await audit(user.id, d.id ? "product.update" : "product.create", "Product", product.id, { name: product.name });
    return d.id ? "Товар сохранён" : { message: "Товар создан как черновик", redirect: `/admin/products/${product.id}` };
  },
  ["/admin/products", "/"],
);

const _setProductStatus = adminAction(
  "products.publish",
  z.object({ id: z.string(), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) }),
  async ({ id, status }, user) => {
    const p = await db.product.findUniqueOrThrow({ where: { id }, include: { variants: { where: { isActive: true } } } });
    if (status === "PUBLISHED" && p.condition !== "USED" && !p.variants.length) {
      throw new AppError("VALIDATION", "Для публикации добавьте хотя бы один активный вариант с ценой");
    }
    await db.product.update({ where: { id }, data: { status, publishedAt: status === "PUBLISHED" ? p.publishedAt ?? new Date() : p.publishedAt } });
    await audit(user.id, `product.${status.toLowerCase()}`, "Product", id);
    return status === "PUBLISHED" ? "Опубликовано" : status === "ARCHIVED" ? "Перенесено в архив" : "Снято с публикации";
  },
  ["/admin/products", "/"],
);

const variantSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  sku: z.string().min(2).max(60),
  color: z.string().max(60).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "формат #RRGGBB").optional(),
  storageGb: optInt,
  ramGb: optInt,
  price: z.coerce.number().int().min(1, "цена должна быть больше 0"),
  oldPrice: optInt,
  initialStock: optInt,
  isActive: z.any().transform(checkbox),
});

const _saveVariant = adminAction(
  "products.write",
  variantSchema,
  async (d, user) => {
    const data = { sku: d.sku.toUpperCase(), color: d.color ?? null, colorHex: d.colorHex ?? null, storageGb: d.storageGb || null, ramGb: d.ramGb || null, price: d.price, oldPrice: d.oldPrice || null, isActive: d.isActive };
    if (d.oldPrice && d.oldPrice <= d.price) throw new AppError("VALIDATION", "Старая цена должна быть больше текущей (иначе оставьте пустой)");
    if (d.id) {
      const before = await db.productVariant.findUniqueOrThrow({ where: { id: d.id } });
      await db.productVariant.update({ where: { id: d.id }, data });
      await audit(user.id, "variant.update", "ProductVariant", d.id, { priceBefore: before.price, priceAfter: d.price });
      return "Вариант сохранён";
    }
    const v = await db.$transaction(async (tx) => {
      const v = await tx.productVariant.create({ data: { ...data, productId: d.productId, stock: d.initialStock ?? 0 } });
      if (d.initialStock) await tx.inventoryMovement.create({ data: { variantId: v.id, delta: d.initialStock, reason: "receipt", actorId: user.id, comment: "Начальный остаток" } });
      return v;
    });
    await audit(user.id, "variant.create", "ProductVariant", v.id, { sku: v.sku });
    return "Вариант добавлен";
  },
  ["/admin/products"],
);

const _adjustStock = adminAction(
  "inventory.write",
  z.object({ variantId: z.string(), delta: z.coerce.number().int().refine((n) => n !== 0, "не может быть 0"), reason: z.enum(["receipt", "adjustment", "writeoff"]), comment: z.string().max(300).optional() }),
  async (d, user) => {
    await db.$transaction(async (tx) => {
      if (d.delta < 0) {
        const r = await tx.productVariant.updateMany({ where: { id: d.variantId, stock: { gte: -d.delta } }, data: { stock: { increment: d.delta } } });
        if (!r.count) throw new AppError("VALIDATION", "Остаток не может стать отрицательным");
      } else {
        await tx.productVariant.update({ where: { id: d.variantId }, data: { stock: { increment: d.delta } } });
      }
      await tx.inventoryMovement.create({ data: { variantId: d.variantId, delta: d.delta, reason: d.reason, comment: d.comment, actorId: user.id } });
    });
    await audit(user.id, "stock.adjust", "ProductVariant", d.variantId, { delta: d.delta, reason: d.reason });
    return `Остаток изменён на ${d.delta > 0 ? "+" : ""}${d.delta}`;
  },
  ["/admin/inventory", "/admin/products"],
);

const _uploadProductImage = adminAction(
  "products.write",
  z.object({ productId: z.string(), variantId: z.string().optional(), alt: z.string().max(200).optional(), url: z.string().url().optional() }),
  async (d, user, fd) => {
    const file = fd.get("file");
    let url = d.url;
    if (file instanceof File && file.size > 0) url = await storeImage(file);
    if (!url) throw new AppError("VALIDATION", "Выберите файл или укажите URL изображения");
    const count = await db.productImage.count({ where: { productId: d.productId } });
    const img = await db.productImage.create({ data: { productId: d.productId, variantId: d.variantId || null, url, alt: d.alt, sortOrder: count } });
    await audit(user.id, "image.add", "Product", d.productId, { imageId: img.id });
    return "Фото добавлено";
  },
  ["/admin/products"],
);

const _deleteImage = adminAction(
  "products.write",
  z.object({ id: z.string() }),
  async ({ id }, user) => {
    const img = await db.productImage.delete({ where: { id } });
    const m = img.url.match(/^\/api\/v1\/media\/(\w+)$/);
    if (m) await db.mediaFile.deleteMany({ where: { id: m[1] } });
    await audit(user.id, "image.delete", "ProductImage", id);
    return "Фото удалено";
  },
  ["/admin/products", "/admin/used"],
);

const _moveImage = adminAction(
  "products.write",
  z.object({ id: z.string(), dir: z.enum(["up", "down"]) }),
  async ({ id, dir }) => {
    const img = await db.productImage.findUniqueOrThrow({ where: { id } });
    const siblings = await db.productImage.findMany({
      where: img.productId ? { productId: img.productId } : { usedUnitId: img.usedUnitId },
      orderBy: { sortOrder: "asc" },
    });
    const i = siblings.findIndex((s) => s.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return "Без изменений";
    const order = [...siblings];
    [order[i], order[j]] = [order[j], order[i]];
    await db.$transaction(order.map((s, k) => db.productImage.update({ where: { id: s.id }, data: { sortOrder: k } })));
    return "Порядок изменён";
  },
  ["/admin/products", "/admin/used"],
);

// Next.js требует явные async-функции в файлах "use server"
export async function saveProduct(prev: ActionState, fd: FormData) {
  return _saveProduct(prev, fd);
}
export async function setProductStatus(prev: ActionState, fd: FormData) {
  return _setProductStatus(prev, fd);
}
export async function saveVariant(prev: ActionState, fd: FormData) {
  return _saveVariant(prev, fd);
}
export async function adjustStock(prev: ActionState, fd: FormData) {
  return _adjustStock(prev, fd);
}
export async function uploadProductImage(prev: ActionState, fd: FormData) {
  return _uploadProductImage(prev, fd);
}
export async function deleteImage(prev: ActionState, fd: FormData) {
  return _deleteImage(prev, fd);
}
export async function moveImage(prev: ActionState, fd: FormData) {
  return _moveImage(prev, fd);
}
