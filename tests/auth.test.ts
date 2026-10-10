import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { authenticate, registerSchema, registerUser, requestPasswordReset, resetPassword } from "@/server/services/auth";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { DEFAULT_ROLES, hasPermission } from "@/server/auth/permissions";

describe("Авторизация", () => {
  it("пароли хранятся только в виде хеша", async () => {
    const h = await hashPassword("secret-password");
    expect(h).not.toContain("secret-password");
    expect(await verifyPassword("secret-password", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });

  it("регистрация, вход и запрет дубликатов", async () => {
    const phone = `+7 707 ${Math.floor(1000000 + Math.random() * 8999999)}`;
    const input = registerSchema.parse({ name: "Айгерим", phone, password: "password123", consent: true });
    const u = await registerUser(input);
    expect(u.phone).toMatch(/^\+7\d{10}$/);
    await expect(registerUser(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await authenticate({ login: phone, password: "password123" })).id).toBe(u.id);
    await expect(authenticate({ login: phone, password: "bad" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("без согласия на обработку данных регистрация невозможна", () => {
    expect(() => registerSchema.parse({ name: "Тест", phone: "+77011112233", password: "password123", consent: false })).toThrow();
  });

  it("восстановление пароля: одноразовая ссылка", async () => {
    const email = `r${Date.now()}@test.kz`;
    const u = await registerUser(registerSchema.parse({ name: "Тест", phone: `+7 708 ${Math.floor(1000000 + Math.random() * 8999999)}`, email, password: "password123", consent: true }));
    await requestPasswordReset(email, "http://test");
    const msg = await db.outboxMessage.findFirstOrThrow({ where: { to: email }, orderBy: { createdAt: "desc" } });
    const token = msg.body.match(/token=([\w-]+)/)![1];
    await resetPassword(token, "newpassword1");
    expect((await authenticate({ login: email, password: "newpassword1" })).id).toBe(u.id);
    await expect(resetPassword(token, "another123")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("Роли и разрешения", () => {
  const role = (key: string) => ({ role: { key, permissions: DEFAULT_ROLES.find((r) => r.key === key)!.permissions as string[] } });
  it("владелец имеет все права, сотрудник — ограниченные, покупатель — никаких", () => {
    expect(hasPermission(role("owner"), "staff.manage")).toBe(true);
    expect(hasPermission(role("admin"), "staff.manage")).toBe(false);
    expect(hasPermission(role("admin"), "settings.write")).toBe(true);
    expect(hasPermission(role("staff"), "orders.write")).toBe(true);
    expect(hasPermission(role("staff"), "settings.write")).toBe(false);
    expect(hasPermission(role("staff"), "promo.write")).toBe(false);
    expect(hasPermission(role("customer"), "admin.access")).toBe(false);
    expect(hasPermission(null, "admin.access")).toBe(false);
  });
});
