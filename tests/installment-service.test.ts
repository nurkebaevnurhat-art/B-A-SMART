import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applicationSchema, createApplication, createContract } from "@/server/services/installment";

describe("Заявки на рассрочку", () => {
  it("цена берётся с сервера, договоры заблокированы до проверки", async () => {
    const p = await db.product.findUniqueOrThrow({ where: { slug: "apple-iphone-16" }, include: { variants: { orderBy: { price: "asc" } } } });
    const input = applicationSchema.parse({ productId: p.id, variantId: p.variants[0].id, downPayment: 100000, termMonths: 6, fullName: "Тест Тестов", phone: "87011234567", city: "Алматы", consent: true });
    const app = await createApplication(input, null);
    expect(app.price).toBe(p.variants[0].price);
    expect(app.totalPrice - app.downPayment).toBe(app.monthlyAmount * 5 + (app.totalPrice - app.downPayment - app.monthlyAmount * 5));
    expect(app.isDemo).toBe(true);
    await db.installmentApplication.update({ where: { id: app.id }, data: { status: "APPROVED" } });
    await expect(createContract(app.id, new Date())).rejects.toMatchObject({ code: "DISABLED" });
  });

  it("товар вне программы не принимается", async () => {
    const p = await db.product.findUniqueOrThrow({ where: { slug: "apple-airtag" } });
    const input = applicationSchema.parse({ productId: p.id, downPayment: 0, termMonths: 3, fullName: "Тест", phone: "+77011234567", city: "Алматы", consent: true });
    await expect(createApplication(input, null)).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
