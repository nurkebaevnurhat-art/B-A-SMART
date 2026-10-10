import { expect, test } from "@playwright/test";

const pages = ["/", "/catalog/smartphones", "/used", "/product/apple-iphone-17-pro", "/installment", "/cart", "/account/login"];

test.describe("Мобильная версия", () => {
  for (const p of pages) {
    test(`нет горизонтальной прокрутки: ${p}`, async ({ page }) => {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("мобильное меню и фильтры", async ({ page }) => {
    await page.goto("/catalog/smartphones");
    await page.getByRole("button", { name: "Фильтры" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Закрыть" }).click();
    await page.getByRole("button", { name: "Меню" }).click();
    await expect(page.getByRole("navigation", { name: "Мобильное меню" })).toBeVisible();
  });
});
