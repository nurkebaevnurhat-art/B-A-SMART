"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { type ActionState, adminAction } from "@/server/admin/action";
import { storeImage } from "@/server/admin/media";
import { audit } from "@/server/services/audit";
import { DEFAULT_CHECKS } from "@/server/services/products";

const optInt = z.coerce.number().int().min(0).optional();

const unitSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "выберите модель"),
  color: z.string().max(60).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "формат #RRGGBB").optional(),
  storageGb: optInt,
  price: z.coerce.number().int().min(1),
  oldPrice: optInt,
  grade: z.enum(["EXCELLENT", "GOOD", "FAIR"]),
  bodyCondition: z.string().min(2, "опишите состояние корпуса").max(500),
  screenCondition: z.string().min(2, "опишите состояние экрана").max(500),
  batteryHealth: z.coerce.number().int().min(1).max(100).optional(),
  defects: z.string().max(1000).optional(),
  repairs: z.string().max(1000).optional(),
  equipment: z.string().max(500).optional(),
  warranty: z.string().max(1000).optional(),
  serialMasked: z.string().max(20).optional(),
});

const _saveUnit = adminAction(
  "used.write",
  unitSchema,
  async (d, user) => {
    const product = await db.product.findUnique({ where: { id: d.productId } });
    if (!product || product.condition !== "USED") throw new AppError("VALIDATION", "Выберите модель с состоянием «Б/у»");
    if (d.serialMasked && d.serialMasked.replace(/\W/g, "").length > 6) {
      throw new AppError("VALIDATION", "Храните только последние 4–6 символов IMEI/серийного номера");
    }
    const data = {
      productId: d.productId,
      color: d.color ?? null,
      colorHex: d.colorHex ?? null,
      storageGb: d.storageGb || null,
      price: d.price,
      oldPrice: d.oldPrice || null,
      grade: d.grade,
      bodyCondition: d.bodyCondition,
      screenCondition: d.screenCondition,
      batteryHealth: d.batteryHealth ?? null,
      defects: d.defects ?? null,
      repairs: d.repairs ?? null,
      equipment: d.equipment ?? null,
      warranty: d.warranty ?? null,
      serialMasked: d.serialMasked ? `…${d.serialMasked.replace(/^…/, "")}` : null,
    };
    if (d.id) {
      await db.usedUnit.update({ where: { id: d.id }, data });
      await audit(user.id, "used.update", "UsedUnit", d.id, { price: d.price, grade: d.grade });
      return "Экземпляр сохранён";
    }
    const [{ n }] = await db.$queryRaw<{ n: bigint }[]>`SELECT nextval('used_unit_code_seq') AS n`;
    const unit = await db.usedUnit.create({
      data: { ...data, code: `BA-U-${n}`, status: "DRAFT", inspection: { create: { inspectorId: user.id, checks: DEFAULT_CHECKS.map((c) => ({ ...c, result: "NOT_TESTED" })) } } },
    });
    await audit(user.id, "used.create", "UsedUnit", unit.id, { code: unit.code });
    return { message: `Экземпляр ${unit.code} создан как черновик`, redirect: `/admin/used/${unit.id}` };
  },
  ["/admin/used", "/used"],
);

const _setUnitStatus = adminAction(
  "used.write",
  z.object({ id: z.string(), status: z.enum(["DRAFT", "AVAILABLE", "ARCHIVED"]) }),
  async ({ id, status }, user) => {
    const u = await db.usedUnit.findUniqueOrThrow({ where: { id }, include: { inspection: true, product: true } });
    if (u.status === "SOLD") throw new AppError("CONFLICT", "Экземпляр продан. Статус меняется только через отмену заказа.");
    if (u.status === "RESERVED" && u.reservedUntil && u.reservedUntil > new Date()) throw new AppError("CONFLICT", "Экземпляр сейчас забронирован покупателем");
    if (status === "AVAILABLE") {
      if (u.product.status !== "PUBLISHED") throw new AppError("VALIDATION", "Сначала опубликуйте модель товара");
      if (!u.inspection) throw new AppError("VALIDATION", "Заполните отчёт проверки перед публикацией");
    }
    await db.usedUnit.update({ where: { id }, data: { status, reservedByCartId: null, reservedUntil: null } });
    await audit(user.id, `used.${status.toLowerCase()}`, "UsedUnit", id);
    return status === "AVAILABLE" ? "Экземпляр в продаже" : status === "ARCHIVED" ? "В архиве" : "Снят с продажи";
  },
  ["/admin/used", "/used"],
);

const _saveInspection = adminAction(
  "inspections.write",
  z.object({
    usedUnitId: z.string(),
    summary: z.string().max(2000).optional(),
    key: z.array(z.string()).default([]),
    label: z.array(z.string()).default([]),
    result: z.array(z.enum(["PASS", "FAIL", "NOT_TESTED"])).default([]),
    note: z.array(z.string()).default([]),
  }),
  async (d, user, fd) => {
    // note[] может содержать пустые значения — берём их напрямую из FormData, чтобы индексы совпадали
    const notes = fd.getAll("note[]").map((x) => String(x).trim());
    const checks = d.key.map((key, i) => ({ key, label: d.label[i], result: d.result[i] ?? "NOT_TESTED", ...(notes[i] ? { note: notes[i] } : {}) })).filter((c) => c.label);
    await db.inspectionReport.upsert({
      where: { usedUnitId: d.usedUnitId },
      create: { usedUnitId: d.usedUnitId, inspectorId: user.id, checks, summary: d.summary },
      update: { inspectorId: user.id, checks, summary: d.summary, inspectedAt: new Date() },
    });
    await audit(user.id, "inspection.save", "UsedUnit", d.usedUnitId, { fails: checks.filter((c) => c.result === "FAIL").length });
    return "Отчёт проверки сохранён";
  },
  ["/admin/used", "/used"],
);

const _uploadUnitImage = adminAction(
  "used.write",
  z.object({ usedUnitId: z.string(), alt: z.string().max(200).optional() }),
  async (d, user, fd) => {
    const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new AppError("VALIDATION", "Выберите фото");
    let count = await db.productImage.count({ where: { usedUnitId: d.usedUnitId } });
    for (const f of files.slice(0, 10)) {
      const url = await storeImage(f);
      await db.productImage.create({ data: { usedUnitId: d.usedUnitId, url, alt: d.alt, sortOrder: count++ } });
    }
    await audit(user.id, "used.photos", "UsedUnit", d.usedUnitId, { added: files.length });
    return `Добавлено фото: ${Math.min(files.length, 10)}`;
  },
  ["/admin/used", "/used"],
);

const _deleteUnitImage = adminAction(
  "used.write",
  z.object({ id: z.string() }),
  async ({ id }, user) => {
    const img = await db.productImage.findUniqueOrThrow({ where: { id } });
    if (!img.usedUnitId) throw new AppError("FORBIDDEN", "Это фото товара, а не экземпляра");
    await db.productImage.delete({ where: { id } });
    const m = img.url.match(/^\/api\/v1\/media\/(\w+)$/);
    if (m) await db.mediaFile.deleteMany({ where: { id: m[1] } });
    await audit(user.id, "used.photo.delete", "UsedUnit", img.usedUnitId, { imageId: id });
    return "Фото удалено";
  },
  ["/admin/used", "/used"],
);

// Next.js требует явные async-функции в файлах "use server"
export async function saveUnit(prev: ActionState, fd: FormData) {
  return _saveUnit(prev, fd);
}
export async function setUnitStatus(prev: ActionState, fd: FormData) {
  return _setUnitStatus(prev, fd);
}
export async function saveInspection(prev: ActionState, fd: FormData) {
  return _saveInspection(prev, fd);
}
export async function uploadUnitImage(prev: ActionState, fd: FormData) {
  return _uploadUnitImage(prev, fd);
}
export async function deleteUnitImage(prev: ActionState, fd: FormData) {
  return _deleteUnitImage(prev, fd);
}
