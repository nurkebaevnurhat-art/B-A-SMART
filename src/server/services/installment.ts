import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizePhone } from "@/lib/format";
import { getSetting } from "./settings";

export { calculateInstallment, type InstallmentCalculation, type ScheduleRow } from "@/lib/installment-calc";
import { calculateInstallment, addMonths } from "@/lib/installment-calc";

export async function calculate(input: { price: number; downPayment: number; termMonths: number }) {
  const s = await getSetting("installment");
  if (!s.enabled) throw new AppError("DISABLED", "Рассрочка временно недоступна");
  return calculateInstallment(input, s);
}

export const applicationSchema = z
  .object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    usedUnitId: z.string().optional(),
    downPayment: z.coerce.number().int().min(0),
    termMonths: z.coerce.number().int().min(1),
    fullName: z.string().trim().min(2, "Укажите ФИО").max(120),
    phone: z.string().trim(),
    city: z.string().trim().min(2, "Укажите город").max(80),
    comment: z.string().trim().max(1000).optional(),
    consent: z.literal(true, { errorMap: () => ({ message: "Необходимо согласие на обработку персональных данных" }) }),
  })
  .transform((v, ctx) => {
    const phone = normalizePhone(v.phone);
    if (!phone) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Укажите номер в формате +7 XXX XXX XX XX" });
    return { ...v, phone: phone ?? "" };
  });

/** Цена определяется сервером по товару/варианту/экземпляру, а не берётся из формы */
async function resolveItem(input: { productId: string; variantId?: string; usedUnitId?: string }) {
  const product = await db.product.findUnique({ where: { id: input.productId }, include: { brand: true } });
  if (!product || product.status !== "PUBLISHED") throw new AppError("NOT_FOUND", "Товар не найден");
  if (!product.installmentAvailable) throw new AppError("VALIDATION", "Этот товар не участвует в программе рассрочки");
  if (input.usedUnitId) {
    const u = await db.usedUnit.findFirst({ where: { id: input.usedUnitId, productId: product.id, status: { in: ["AVAILABLE", "RESERVED"] } } });
    if (!u) throw new AppError("NOT_FOUND", "Экземпляр недоступен");
    return { product, price: u.price, name: `${product.name} (б/у, № ${u.code})`, variantId: null, usedUnitId: u.id };
  }
  const variant = input.variantId
    ? await db.productVariant.findFirst({ where: { id: input.variantId, productId: product.id, isActive: true } })
    : await db.productVariant.findFirst({ where: { productId: product.id, isActive: true }, orderBy: { price: "asc" } });
  if (!variant) throw new AppError("NOT_FOUND", "Вариант товара не найден");
  const parts = [product.name, variant.color, variant.storageGb ? `${variant.storageGb} ГБ` : null].filter(Boolean);
  return { product, price: variant.price, name: parts.join(", "), variantId: variant.id, usedUnitId: null };
}

export async function createApplication(input: z.infer<typeof applicationSchema>, userId: string | null) {
  const s = await getSetting("installment");
  if (!s.enabled) throw new AppError("DISABLED", "Приём заявок временно приостановлен");
  const item = await resolveItem(input);
  const calc = calculateInstallment({ price: item.price, downPayment: input.downPayment, termMonths: input.termMonths }, s);
  const [{ n }] = await db.$queryRaw<{ n: bigint }[]>`SELECT nextval('application_number_seq') AS n`;
  return db.installmentApplication.create({
    data: {
      number: `R-${n.toString()}`,
      userId,
      productId: item.product.id,
      variantId: item.variantId,
      usedUnitId: item.usedUnitId,
      itemName: item.name,
      price: calc.price,
      markup: calc.markup,
      totalPrice: calc.totalPrice,
      downPayment: calc.downPayment,
      termMonths: calc.termMonths,
      monthlyAmount: calc.monthly,
      fullName: input.fullName,
      phone: input.phone,
      city: input.city,
      comment: input.comment,
      consentAt: new Date(),
      isDemo: s.isDemo,
    },
  });
}

/**
 * Создание договора и графика платежей по одобренной заявке.
 * Заблокировано, пока владелец не включит contractsEnabled после проверки модели сделки
 * специалистом по исламским финансам и юристом.
 */
export async function createContract(applicationId: string, startDate: Date) {
  const s = await getSetting("installment");
  if (!s.contractsEnabled) {
    throw new AppError("DISABLED", "Заключение договоров отключено до проверки модели сделки специалистом по исламским финансам и юристом");
  }
  const app = await db.installmentApplication.findUnique({ where: { id: applicationId }, include: { contract: true } });
  if (!app) throw new AppError("NOT_FOUND", "Заявка не найдена");
  if (app.status !== "APPROVED") throw new AppError("CONFLICT", "Договор можно создать только по одобренной заявке");
  if (app.contract) throw new AppError("CONFLICT", "Договор уже создан");
  return createContractRecord(app, startDate, s.isDemo);
}

export async function createContractRecord(
  app: { id: string; number: string; userId: string | null; totalPrice: number; downPayment: number; termMonths: number },
  startDate: Date,
  isDemo: boolean,
) {
  const financed = app.totalPrice - app.downPayment;
  const monthly = Math.floor(financed / app.termMonths);
  const schedule = Array.from({ length: app.termMonths }, (_, i) => ({
    seq: i + 1,
    dueDate: addMonths(startDate, i + 1),
    amount: i + 1 === app.termMonths ? financed - monthly * (app.termMonths - 1) : monthly,
  }));
  return db.installmentContract.create({
    data: {
      number: `D-${app.number}`,
      applicationId: app.id,
      userId: app.userId,
      totalPrice: app.totalPrice,
      downPayment: app.downPayment,
      termMonths: app.termMonths,
      startDate,
      isDemo,
      status: "ACTIVE",
      schedule: { create: schedule },
    },
    include: { schedule: true },
  });
}

export const APPLICATION_STATUS_LABELS = {
  NEW: "Новая",
  IN_REVIEW: "На рассмотрении",
  APPROVED: "Одобрена",
  REJECTED: "Отклонена",
  CANCELLED: "Отменена",
} as const;
