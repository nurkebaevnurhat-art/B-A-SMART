import { expect, test, type Page } from "@playwright/test";

async function fillCheckout(page: Page, payment: "cash" | "online") {
  await page.getByLabel("Имя и фамилия").fill("E2E Покупатель");
  await page.getByLabel("Телефон").fill("7011234567");
  await page.getByRole("radio", { name: /Самовывоз из магазина/ }).check();
  if (payment === "online") await page.getByRole("radio", { name: /Онлайн-оплата картой/ }).check();
}

test.describe("Покупатель", () => {
  test("главная страница и навигация", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Популярные смартфоны" })).toBeVisible();
    await page.getByRole("link", { name: "Б/у", exact: true }).first().click();
    await expect(page).toHaveURL(/\/used/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Б\/у смартфоны/);
  });

  test("фильтры каталога сохраняются в URL", async ({ page }) => {
    await page.goto("/catalog/smartphones");
    await page.locator("aside").getByLabel("Samsung").check();
    await expect(page).toHaveURL(/brand=samsung/);
    await expect(page.locator("article").first()).toContainText("Samsung");
    await page.reload();
    await expect(page.locator("aside").getByLabel("Samsung")).toBeChecked();
  });

  test("покупка нового смартфона с оплатой при получении", async ({ page }) => {
    await page.goto("/product/apple-iphone-17");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Apple iPhone 17");
    await page.getByRole("button", { name: "В корзину", exact: true }).click();
    await expect(page.getByText("Товар добавлен в корзину")).toBeVisible();
    await page.goto("/cart");
    await expect(page.getByText("Apple iPhone 17").first()).toBeVisible();
    await page.getByRole("link", { name: "Перейти к оформлению" }).click();
    await fillCheckout(page, "cash");
    await page.getByRole("button", { name: /Подтвердить заказ/ }).click();
    await expect(page.getByText("Спасибо! Заказ оформлен")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Новый").first()).toBeVisible();
  });

  test("б/у экземпляр: бронь при оформлении и тестовая онлайн-оплата", async ({ page }) => {
    await page.goto("/used?inStock=1");
    await page.locator("article a[href^='/used/BA-U-']").first().click();
    await page.waitForURL(/\/used\/BA-U-\d+$/);
    const code = page.url().split("/").pop()!;
    await page.getByRole("button", { name: "В корзину", exact: true }).click();
    await expect(page.getByText("Товар добавлен в корзину")).toBeVisible();
    await page.goto("/checkout");
    await expect(page.getByText(/забронированы за вами/)).toBeVisible();
    await fillCheckout(page, "online");
    await page.getByRole("button", { name: /Подтвердить заказ/ }).click();
    await expect(page.getByText("Тестовый режим")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Успешная оплата" }).click();
    await expect(page.getByText("Оплата подтверждена (тестовый платёж)")).toBeVisible({ timeout: 15000 });
    // Экземпляр больше не продаётся
    await page.goto(`/used/${code}`);
    await expect(page.getByText("Этот экземпляр уже продан")).toBeVisible();
  });

  test("калькулятор рассрочки и заявка", async ({ page }) => {
    await page.goto("/installment?product=apple-iphone-16");
    await expect(page.getByText("Ежемесячный платёж")).toBeVisible();
    await page.getByRole("button", { name: "12 мес." }).click();
    await page.getByLabel("ФИО").fill("E2E Заявитель");
    await page.getByLabel("Телефон").fill("7019998877");
    await page.getByLabel(/Согласен/).check();
    await page.getByRole("button", { name: "Оставить заявку" }).click();
    await expect(page.getByText(/Заявка № R-\d+ принята/)).toBeVisible();
  });

  test("покупатель не может открыть админ-панель", async ({ page, request }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account\/login/);
    const res = await request.post("/api/v1/auth/login", { data: { login: "customer@basmart.kz", password: "Demo12345!" }, headers: { origin: "http://localhost:5520" } });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("Администратор", () => {
  test("вход и подтверждение заказа", async ({ page }) => {
    await page.goto("/account/login?next=/admin/orders");
    await page.getByLabel("Телефон или email").fill("admin@basmart.kz");
    await page.getByLabel("Пароль").fill("Demo12345!");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByRole("heading", { name: "Заказы", level: 1 })).toBeVisible({ timeout: 15000 });
    await page.goto("/admin/orders?status=NEW");
    await page.locator("tbody a").first().click();
    await expect(page.getByRole("heading", { name: /Заказ BA-/ })).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByLabel("Новый статус").selectOption("CONFIRMED");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page.getByText("Статус обновлён")).toBeVisible();
    await expect(page.getByText("Подтверждён").first()).toBeVisible();
  });

  test("CSRF: запрос с чужого Origin отклоняется", async ({ request }) => {
    const res = await request.post("/api/v1/cart/items", { data: { variantId: "x" }, headers: { origin: "https://evil.example" } });
    expect(res.status()).toBe(403);
  });
});
