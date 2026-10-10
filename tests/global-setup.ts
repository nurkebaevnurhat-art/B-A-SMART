import { execSync } from "node:child_process";

/**
 * Готовит отдельную тестовую БД basmart_test: применяет миграции (без удаления базы)
 * и загружает демо-данные. Рабочую базу тесты не трогают.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL || "postgresql://basmart:basmart@localhost:5432/basmart_test?schema=public";
  if (!/_test\b|test/.test(new URL(url).pathname)) throw new Error("TEST_DATABASE_URL должен указывать на тестовую базу (имя содержит test)");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
}
