/**
 * Подготовка БОЕВОЙ базы без демо-данных: создаёт роли и первого владельца.
 * Существующие данные не удаляет. Запуск:
 *   OWNER_EMAIL=you@shop.kz OWNER_PASSWORD='надёжный-пароль' OWNER_NAME='Имя' npm run db:bootstrap
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { DEFAULT_ROLES } from "../src/server/auth/permissions";

const db = new PrismaClient();

async function main() {
  for (const r of DEFAULT_ROLES) {
    await db.role.upsert({ where: { key: r.key }, create: { key: r.key, name: r.name, permissions: r.permissions }, update: {} });
  }
  console.log("✓ Роли созданы");
  const email = process.env.OWNER_EMAIL?.toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) {
    console.log("OWNER_EMAIL / OWNER_PASSWORD не заданы — владелец не создан");
    return;
  }
  if (password.length < 10) throw new Error("Пароль владельца должен быть не короче 10 символов");
  const owner = await db.role.findUniqueOrThrow({ where: { key: "owner" } });
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) {
    console.log(`Пользователь ${email} уже существует — пропускаем`);
    return;
  }
  await db.user.create({ data: { email, name: process.env.OWNER_NAME || "Владелец", passwordHash: await hashPassword(password), roleId: owner.id } });
  console.log(`✓ Владелец ${email} создан. Войдите на сайте и откройте /admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
