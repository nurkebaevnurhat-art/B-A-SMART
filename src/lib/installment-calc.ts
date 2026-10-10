/** Чистый расчёт рассрочки — общий для сервера и браузера. */
import { AppError } from "./errors";

export type InstallmentSettings = {
  terms: number[];
  minDownPercent: number;
  markupPercentByTerm: Record<string, number>;
  minPrice: number;
  maxPrice: number;
  isDemo: boolean;
};

export type ScheduleRow = { seq: number; dueDate: string; amount: number; label: string };

export type InstallmentCalculation = {
  price: number;
  /** Фиксированная наценка продавца, согласуемая ДО сделки. Не начисляется со временем. */
  markup: number;
  totalPrice: number;
  downPayment: number;
  financed: number;
  termMonths: number;
  monthly: number;
  schedule: ScheduleRow[];
  isDemo: boolean;
};

export function addMonths(d: Date, n: number) {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, last));
  return r;
}

/**
 * Расчёт рассрочки.
 * - Итоговая цена = цена товара + фиксированная наценка по сроку (если задана в админке; по умолчанию 0).
 * - Никаких процентов на остаток, комиссий и штрафов.
 * - Остаток делится на равные платежи; копеечный остаток — в последний платёж.
 */
export function calculateInstallment(
  input: { price: number; downPayment: number; termMonths: number; startDate?: Date },
  s: InstallmentSettings,
): InstallmentCalculation {
  const { price, termMonths } = input;
  if (!Number.isInteger(price) || price <= 0) throw new AppError("VALIDATION", "Некорректная цена");
  if (!s.terms.includes(termMonths)) throw new AppError("VALIDATION", `Доступные сроки: ${s.terms.join(", ")} мес.`);
  if (price < s.minPrice || price > s.maxPrice) {
    throw new AppError("VALIDATION", `Рассрочка доступна для товаров стоимостью от ${s.minPrice.toLocaleString("ru-RU")} до ${s.maxPrice.toLocaleString("ru-RU")} ₸`);
  }
  const markupPercent = s.markupPercentByTerm[String(termMonths)] ?? 0;
  const markup = Math.round((price * markupPercent) / 100);
  const totalPrice = price + markup;
  const minDown = Math.ceil((totalPrice * s.minDownPercent) / 100);
  const downPayment = Math.round(input.downPayment);
  if (downPayment < minDown) throw new AppError("VALIDATION", `Минимальный первоначальный взнос — ${minDown.toLocaleString("ru-RU")} ₸`);
  if (downPayment >= totalPrice) throw new AppError("VALIDATION", "Первоначальный взнос должен быть меньше стоимости");

  const financed = totalPrice - downPayment;
  const monthly = Math.floor(financed / termMonths);
  const start = input.startDate ?? new Date();
  const schedule: ScheduleRow[] = [];
  for (let i = 1; i <= termMonths; i++) {
    const amount = i === termMonths ? financed - monthly * (termMonths - 1) : monthly;
    const due = addMonths(start, i);
    schedule.push({ seq: i, dueDate: due.toISOString(), amount, label: `Платёж ${i}` });
  }
  return { price, markup, totalPrice, downPayment, financed, termMonths, monthly, schedule, isDemo: s.isDemo };
}

