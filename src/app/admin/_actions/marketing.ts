"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { type ActionState, adminAction, checkbox } from "@/server/admin/action";
import { storeImage } from "@/server/admin/media";
import { audit } from "@/server/services/audit";
import { createContract } from "@/server/services/installment";

// ── Рассрочка ──
const _setApplicationStatus = adminAction(
  "installments.write",
  z.object({ id: z.string(), status: z.enum(["NEW", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED"]), managerNote: z.string().max(2000).optional() }),
  async (d, user) => {
    await db.installmentApplication.update({ where: { id: d.id }, data: { status: d.status, managerNote: d.managerNote ?? null } });
    await audit(user.id, "installment.status", "InstallmentApplication", d.id, { status: d.status });
    return "Заявка обновлена";
  },
  ["/admin/installments"],
);

const _createContractAction = adminAction(
  "installments.write",
  z.object({ applicationId: z.string(), startDate: z.coerce.date() }),
  async (d, user) => {
    const c = await createContract(d.applicationId, d.startDate);
    await audit(user.id, "installment.contract", "InstallmentContract", c.id, { number: c.number });
    return `Договор ${c.number} создан`;
  },
  ["/admin/installments"],
);

const _markSchedulePaid = adminAction(
  "installments.write",
  z.object({ id: z.string(), paid: z.enum(["1", "0"]) }),
  async (d, user) => {
    const item = await db.paymentScheduleItem.update({ where: { id: d.id }, data: d.paid === "1" ? { status: "PAID", paidAt: new Date() } : { status: "PENDING", paidAt: null } });
    const rest = await db.paymentScheduleItem.count({ where: { contractId: item.contractId, status: "PENDING" } });
    await db.installmentContract.update({ where: { id: item.contractId }, data: { status: rest === 0 ? "COMPLETED" : "ACTIVE" } });
    await audit(user.id, d.paid === "1" ? "schedule.paid" : "schedule.unpaid", "InstallmentContract", item.contractId, { seq: item.seq });
    return d.paid === "1" ? "Платёж отмечен" : "Отметка снята";
  },
  ["/admin/installments"],
);

// ── Промокоды ──
const _savePromo = adminAction(
  "promo.write",
  z.object({
    id: z.string().optional(),
    code: z.string().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, "латиница, цифры, - и _"),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.coerce.number().int().min(1),
    minOrderTotal: z.coerce.number().int().min(0).default(0),
    maxUses: z.coerce.number().int().min(1).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isActive: z.any().transform(checkbox),
  }),
  async (d, user) => {
    if (d.type === "PERCENT" && d.value > 90) throw new AppError("VALIDATION", "Скидка не может превышать 90%");
    const data = { code: d.code.toUpperCase(), type: d.type, value: d.value, minOrderTotal: d.minOrderTotal, maxUses: d.maxUses ?? null, startsAt: d.startsAt ?? null, endsAt: d.endsAt ?? null, isActive: d.isActive };
    const p = d.id ? await db.promoCode.update({ where: { id: d.id }, data }) : await db.promoCode.create({ data });
    await audit(user.id, d.id ? "promo.update" : "promo.create", "PromoCode", p.id, { code: p.code });
    return "Промокод сохранён";
  },
  ["/admin/promo"],
);

// ── Отзывы ──
const _moderateReview = adminAction(
  "reviews.moderate",
  z.object({ id: z.string(), status: z.enum(["APPROVED", "REJECTED", "PENDING"]) }),
  async (d, user) => {
    await db.review.update({ where: { id: d.id }, data: { status: d.status } });
    await audit(user.id, "review.moderate", "Review", d.id, { status: d.status });
    return d.status === "APPROVED" ? "Отзыв опубликован" : "Отзыв скрыт";
  },
  ["/admin/reviews", "/"],
);

// ── Баннеры ──
const _saveBanner = adminAction(
  "banners.write",
  z.object({
    id: z.string().optional(),
    placement: z.enum(["hero", "promo"]).default("hero"),
    title: z.string().min(2).max(120),
    titleKk: z.string().max(120).optional(),
    subtitle: z.string().max(300).optional(),
    subtitleKk: z.string().max(300).optional(),
    ctaLabel: z.string().max(40).optional(),
    ctaHref: z.string().max(300).regex(/^\/|^https:\/\//, "ссылка должна начинаться с / или https://").optional(),
    imageUrl: z.string().max(500).optional(),
    theme: z.enum(["dark", "light", "brand"]),
    sortOrder: z.coerce.number().int().default(0),
    isActive: z.any().transform(checkbox),
  }),
  async (d, user, fd) => {
    const file = fd.get("file");
    let imageUrl = d.imageUrl ?? null;
    if (file instanceof File && file.size > 0) imageUrl = await storeImage(file);
    const { id, ...rest } = d;
    const data = { ...rest, imageUrl, titleKk: d.titleKk ?? null, subtitle: d.subtitle ?? null, subtitleKk: d.subtitleKk ?? null, ctaLabel: d.ctaLabel ?? null, ctaHref: d.ctaHref ?? null };
    const b = id ? await db.banner.update({ where: { id }, data }) : await db.banner.create({ data });
    await audit(user.id, id ? "banner.update" : "banner.create", "Banner", b.id);
    return "Баннер сохранён";
  },
  ["/admin/banners", "/"],
);

const _deleteBanner = adminAction(
  "banners.write",
  z.object({ id: z.string() }),
  async ({ id }, user) => {
    await db.banner.delete({ where: { id } });
    await audit(user.id, "banner.delete", "Banner", id);
    return "Баннер удалён";
  },
  ["/admin/banners", "/"],
);

// ── Поддержка ──
const _replyTicket = adminAction(
  "support.write",
  z.object({ id: z.string(), reply: z.string().max(3000).optional(), status: z.enum(["OPEN", "ANSWERED", "CLOSED"]) }),
  async (d, user) => {
    await db.supportTicket.update({ where: { id: d.id }, data: { reply: d.reply ?? null, status: d.status } });
    await audit(user.id, "support.reply", "SupportTicket", d.id, { status: d.status });
    return "Ответ сохранён";
  },
  ["/admin/support"],
);

// Next.js требует явные async-функции в файлах "use server"
export async function setApplicationStatus(prev: ActionState, fd: FormData) {
  return _setApplicationStatus(prev, fd);
}
export async function createContractAction(prev: ActionState, fd: FormData) {
  return _createContractAction(prev, fd);
}
export async function markSchedulePaid(prev: ActionState, fd: FormData) {
  return _markSchedulePaid(prev, fd);
}
export async function savePromo(prev: ActionState, fd: FormData) {
  return _savePromo(prev, fd);
}
export async function moderateReview(prev: ActionState, fd: FormData) {
  return _moderateReview(prev, fd);
}
export async function saveBanner(prev: ActionState, fd: FormData) {
  return _saveBanner(prev, fd);
}
export async function deleteBanner(prev: ActionState, fd: FormData) {
  return _deleteBanner(prev, fd);
}
export async function replyTicket(prev: ActionState, fd: FormData) {
  return _replyTicket(prev, fd);
}
