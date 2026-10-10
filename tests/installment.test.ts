import { describe, expect, it } from "vitest";
import { calculateInstallment } from "@/lib/installment-calc";

const s = { terms: [3, 6, 12], minDownPercent: 10, markupPercentByTerm: { "3": 0, "6": 0, "12": 0 }, minPrice: 30000, maxPrice: 2_000_000, isDemo: true };

describe("Калькулятор халяльной рассрочки", () => {
  it("сумма платежей равна полной цене, без процентов", () => {
    const r = calculateInstallment({ price: 429990, downPayment: 50000, termMonths: 12 }, s);
    expect(r.markup).toBe(0);
    expect(r.totalPrice).toBe(429990);
    expect(r.schedule).toHaveLength(12);
    const sum = r.schedule.reduce((a, x) => a + x.amount, 0);
    expect(sum + r.downPayment).toBe(r.totalPrice);
    // Все платежи равны, кроме, возможно, последнего (округление)
    expect(new Set(r.schedule.slice(0, -1).map((x) => x.amount)).size).toBe(1);
  });

  it("фиксированная наценка добавляется один раз и не зависит от взноса", () => {
    const withMarkup = { ...s, markupPercentByTerm: { ...s.markupPercentByTerm, "12": 5 } };
    const a = calculateInstallment({ price: 200000, downPayment: 30000, termMonths: 12 }, withMarkup);
    const b = calculateInstallment({ price: 200000, downPayment: 100000, termMonths: 12 }, withMarkup);
    expect(a.markup).toBe(10000);
    expect(a.totalPrice).toBe(b.totalPrice);
  });

  it("отклоняет недопустимый срок, слишком малый взнос и цену вне лимитов", () => {
    expect(() => calculateInstallment({ price: 200000, downPayment: 30000, termMonths: 7 }, s)).toThrow(/сроки/i);
    expect(() => calculateInstallment({ price: 200000, downPayment: 1000, termMonths: 6 }, s)).toThrow(/взнос/i);
    expect(() => calculateInstallment({ price: 10000, downPayment: 1000, termMonths: 6 }, s)).toThrow(/от/);
    expect(() => calculateInstallment({ price: 200000, downPayment: 200000, termMonths: 6 }, s)).toThrow();
  });

  it("даты платежей идут помесячно", () => {
    const r = calculateInstallment({ price: 120000, downPayment: 12000, termMonths: 3, startDate: new Date("2026-01-31T00:00:00Z") }, s);
    const months = r.schedule.map((x) => new Date(x.dueDate).getUTCMonth());
    expect(months).toEqual([1, 2, 3]);
  });
});
