"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizePhone, slugify } from "@/lib/format";
import { type ActionState, adminAction, checkbox } from "@/server/admin/action";
import { audit } from "@/server/services/audit";
import { setSetting } from "@/server/services/settings";
import { hashPassword } from "@/server/auth/password";
import { ALL_PERMISSIONS } from "@/server/auth/permissions";

const lines = (v?: string) => (v ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

const _saveStoreSettings = adminAction(
  "settings.write",
  z.object({
    name: z.string().min(1), phone: z.string().optional(), whatsapp: z.string().optional(), email: z.string().optional(), city: z.string().min(1),
    address: z.string().optional(), workHours: z.string().optional(), instagram: z.string().optional(), legalName: z.string().optional(), bin: z.string().optional(), cities: z.string().optional(),
  }),
  async (d, user) => {
    const v = await setSetting("store", { ...d, phone: d.phone ?? "", whatsapp: d.whatsapp ?? "", email: d.email ?? "", address: d.address ?? "", workHours: d.workHours ?? "", instagram: d.instagram ?? "", legalName: d.legalName ?? "", bin: d.bin ?? "", cities: lines(d.cities) });
    await audit(user.id, "settings.store", "Setting", "store", v);
    return "Настройки магазина сохранены";
  },
  ["/"],
);

const _saveTopbar = adminAction(
  "settings.write",
  z.object({ ru: z.array(z.string()).default([]), kk: z.array(z.string()).default([]), href: z.array(z.string()).default([]) }),
  async (_d, user, fd) => {
    const ru = fd.getAll("ru[]").map(String), kk = fd.getAll("kk[]").map(String), href = fd.getAll("href[]").map(String);
    const items = ru.map((r, i) => ({ ru: r.trim(), kk: (kk[i] ?? "").trim(), href: (href[i] ?? "").trim() })).filter((x) => x.ru);
    await setSetting("topbar", { items });
    await audit(user.id, "settings.topbar", "Setting", "topbar", { items });
    return "Информационная полоса сохранена";
  },
  ["/"],
);

const _saveGrades = adminAction(
  "settings.write",
  z.object({ EXCELLENT_ru: z.string(), EXCELLENT_kk: z.string().default(""), GOOD_ru: z.string(), GOOD_kk: z.string().default(""), FAIR_ru: z.string(), FAIR_kk: z.string().default("") }),
  async (d, user) => {
    const v = await setSetting("grades", { EXCELLENT: { ru: d.EXCELLENT_ru, kk: d.EXCELLENT_kk }, GOOD: { ru: d.GOOD_ru, kk: d.GOOD_kk }, FAIR: { ru: d.FAIR_ru, kk: d.FAIR_kk } });
    await audit(user.id, "settings.grades", "Setting", "grades", v);
    return "Критерии состояния сохранены";
  },
  ["/used", "/info/used-check"],
);

const _saveInstallmentSettings = adminAction(
  "settings.write",
  z.object({
    enabled: z.any().transform(checkbox), isDemo: z.any().transform(checkbox), contractsEnabled: z.any().transform(checkbox),
    terms: z.string(), minDownPercent: z.coerce.number(), minPrice: z.coerce.number().int(), maxPrice: z.coerce.number().int(), markups: z.string().optional(),
  }),
  async (d, user) => {
    const terms = [...new Set(d.terms.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
    const markupPercentByTerm: Record<string, number> = {};
    for (const t of terms) markupPercentByTerm[String(t)] = 0;
    for (const pair of (d.markups ?? "").split(/[,;\s]+/).filter(Boolean)) {
      const [k, v] = pair.split(":").map((x) => x.trim());
      if (k && v !== undefined && terms.includes(Number(k))) markupPercentByTerm[k] = Number(v);
    }
    if (d.contractsEnabled && user.role.key !== "owner") throw new AppError("FORBIDDEN", "Включить заключение договоров может только владелец");
    if (d.contractsEnabled && d.isDemo) throw new AppError("VALIDATION", "Нельзя заключать договоры в демонстрационном режиме");
    const v = await setSetting("installment", { enabled: d.enabled, isDemo: d.isDemo, contractsEnabled: d.contractsEnabled, terms, minDownPercent: d.minDownPercent, markupPercentByTerm, minPrice: d.minPrice, maxPrice: d.maxPrice });
    await audit(user.id, "settings.installment", "Setting", "installment", v);
    return "Условия рассрочки сохранены";
  },
  ["/installment", "/"],
);

const _saveCheckoutSettings = adminAction(
  "settings.write",
  z.object({ reservationMinutes: z.coerce.number().int(), cashOnDeliveryEnabled: z.any().transform(checkbox), onlinePaymentEnabled: z.any().transform(checkbox) }),
  async (d, user) => {
    if (!d.cashOnDeliveryEnabled && !d.onlinePaymentEnabled) throw new AppError("VALIDATION", "Включите хотя бы один способ оплаты");
    const v = await setSetting("checkout", d);
    await audit(user.id, "settings.checkout", "Setting", "checkout", v);
    return "Настройки оформления сохранены";
  },
);

const _saveDelivery = adminAction(
  "settings.write",
  z.object({
    id: z.string().optional(), code: z.string().min(2).max(40), nameRu: z.string().min(2), nameKk: z.string().min(2), description: z.string().optional(),
    price: z.coerce.number().int().min(0), freeFrom: z.coerce.number().int().min(0).optional(), needsAddress: z.any().transform(checkbox), isActive: z.any().transform(checkbox), sortOrder: z.coerce.number().int().default(0),
  }),
  async (d, user) => {
    const { id, ...data } = d;
    const row = { ...data, code: slugify(d.code).replace(/-/g, "_"), description: d.description ?? null, freeFrom: d.freeFrom ?? null };
    const o = id ? await db.deliveryOption.update({ where: { id }, data: row }) : await db.deliveryOption.create({ data: row });
    await audit(user.id, "delivery.save", "DeliveryOption", o.id, row);
    return "Способ доставки сохранён";
  },
  ["/"],
);

const _saveCategory = adminAction(
  "products.write",
  z.object({ id: z.string().optional(), slug: z.string().optional(), nameRu: z.string().min(2), nameKk: z.string().min(2), group: z.enum(["devices", "accessories"]), sortOrder: z.coerce.number().int().default(0) }),
  async (d, user) => {
    const data = { slug: slugify(d.slug || d.nameRu), nameRu: d.nameRu, nameKk: d.nameKk, group: d.group, sortOrder: d.sortOrder };
    const c = d.id ? await db.category.update({ where: { id: d.id }, data }) : await db.category.create({ data });
    await audit(user.id, "category.save", "Category", c.id, data);
    return "Категория сохранена";
  },
  ["/"],
);

const _saveBrand = adminAction(
  "products.write",
  z.object({ id: z.string().optional(), name: z.string().min(1).max(60), sortOrder: z.coerce.number().int().default(0) }),
  async (d, user) => {
    const data = { name: d.name, slug: slugify(d.name), sortOrder: d.sortOrder };
    const b = d.id ? await db.brand.update({ where: { id: d.id }, data }) : await db.brand.create({ data });
    await audit(user.id, "brand.save", "Brand", b.id, data);
    return "Бренд сохранён";
  },
  ["/"],
);

// ── Сотрудники и роли (только staff.manage) ──
const _createStaff = adminAction(
  "staff.manage",
  z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(), password: z.string().min(10, "минимум 10 символов"), roleKey: z.enum(["admin", "staff", "owner"]) }),
  async (d, user) => {
    const phone = d.phone ? normalizePhone(d.phone) : null;
    if (d.phone && !phone) throw new AppError("VALIDATION", "Некорректный телефон");
    const role = await db.role.findUniqueOrThrow({ where: { key: d.roleKey } });
    const u = await db.user.create({ data: { name: d.name, email: d.email.toLowerCase(), phone, passwordHash: await hashPassword(d.password), roleId: role.id } });
    await audit(user.id, "staff.create", "User", u.id, { email: u.email, role: d.roleKey });
    return "Сотрудник добавлен";
  },
  ["/admin/staff"],
);

const _updateStaff = adminAction(
  "staff.manage",
  z.object({ id: z.string(), roleKey: z.enum(["owner", "admin", "staff", "customer"]), isActive: z.any().transform(checkbox) }),
  async (d, user) => {
    if (d.id === user.id) throw new AppError("VALIDATION", "Нельзя менять собственную роль или блокировать себя");
    const target = await db.user.findUniqueOrThrow({ where: { id: d.id }, include: { role: true } });
    if (target.role.key === "owner" && (d.roleKey !== "owner" || !d.isActive)) {
      const owners = await db.user.count({ where: { role: { key: "owner" }, isActive: true } });
      if (owners <= 1) throw new AppError("VALIDATION", "Должен остаться хотя бы один активный владелец");
    }
    const role = await db.role.findUniqueOrThrow({ where: { key: d.roleKey } });
    await db.user.update({ where: { id: d.id }, data: { roleId: role.id, isActive: d.isActive } });
    if (!d.isActive) await db.session.deleteMany({ where: { userId: d.id } });
    await audit(user.id, "staff.update", "User", d.id, { role: d.roleKey, isActive: d.isActive });
    return "Сотрудник обновлён";
  },
  ["/admin/staff"],
);

const _saveRolePermissions = adminAction(
  "staff.manage",
  z.object({ key: z.enum(["admin", "staff"]), permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).default([]) }),
  async (d, user) => {
    const perms = d.permissions.includes("admin.access") ? d.permissions : ["admin.access", ...d.permissions];
    await db.role.update({ where: { key: d.key }, data: { permissions: perms } });
    await audit(user.id, "role.permissions", "Role", d.key, { permissions: perms });
    return "Разрешения роли сохранены";
  },
  ["/admin"],
);

// Next.js требует явные async-функции в файлах "use server"
export async function saveStoreSettings(prev: ActionState, fd: FormData) {
  return _saveStoreSettings(prev, fd);
}
export async function saveTopbar(prev: ActionState, fd: FormData) {
  return _saveTopbar(prev, fd);
}
export async function saveGrades(prev: ActionState, fd: FormData) {
  return _saveGrades(prev, fd);
}
export async function saveInstallmentSettings(prev: ActionState, fd: FormData) {
  return _saveInstallmentSettings(prev, fd);
}
export async function saveCheckoutSettings(prev: ActionState, fd: FormData) {
  return _saveCheckoutSettings(prev, fd);
}
export async function saveDelivery(prev: ActionState, fd: FormData) {
  return _saveDelivery(prev, fd);
}
export async function saveCategory(prev: ActionState, fd: FormData) {
  return _saveCategory(prev, fd);
}
export async function saveBrand(prev: ActionState, fd: FormData) {
  return _saveBrand(prev, fd);
}
export async function createStaff(prev: ActionState, fd: FormData) {
  return _createStaff(prev, fd);
}
export async function updateStaff(prev: ActionState, fd: FormData) {
  return _updateStaff(prev, fd);
}
export async function saveRolePermissions(prev: ActionState, fd: FormData) {
  return _saveRolePermissions(prev, fd);
}
