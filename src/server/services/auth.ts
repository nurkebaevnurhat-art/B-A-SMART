import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizePhone } from "@/lib/format";
import { hashPassword, randomToken, sha256, verifyPassword } from "@/server/auth/password";
import { queueMessage } from "./outbox";

const password = z.string().min(8, "Пароль должен быть не короче 8 символов").max(128);

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Укажите имя").max(80),
    phone: z.string().trim(),
    email: z.string().trim().email("Некорректный email").max(120).optional().or(z.literal("").transform(() => undefined)),
    password,
    consent: z.literal(true, { errorMap: () => ({ message: "Необходимо согласие на обработку персональных данных" }) }),
  })
  .transform((v, ctx) => {
    const phone = normalizePhone(v.phone);
    if (!phone) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Укажите номер в формате +7 XXX XXX XX XX" });
    return { ...v, phone: phone ?? "", email: v.email?.toLowerCase() };
  });

export const loginSchema = z.object({
  login: z.string().trim().min(3, "Укажите телефон или email").max(120),
  password: z.string().min(1, "Введите пароль").max(128),
});

function identifierWhere(login: string) {
  if (login.includes("@")) return { email: login.toLowerCase() };
  const phone = normalizePhone(login);
  return phone ? { phone } : null;
}

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const exists = await db.user.findFirst({
    where: { OR: [{ phone: input.phone }, ...(input.email ? [{ email: input.email }] : [])] },
  });
  if (exists) throw new AppError("CONFLICT", "Пользователь с таким телефоном или email уже зарегистрирован");
  const role = await db.role.findUniqueOrThrow({ where: { key: "customer" } });
  return db.user.create({
    data: { name: input.name, phone: input.phone, email: input.email, passwordHash: await hashPassword(input.password), roleId: role.id },
  });
}

// Простое ограничение частоты попыток входа (в памяти процесса).
// В продакшене с несколькими инстансами стоит вынести в Redis/БД.
const attempts = new Map<string, { n: number; until: number }>();
export function checkRate(key: string, max = 8, windowMs = 10 * 60_000) {
  const now = Date.now();
  const a = attempts.get(key);
  if (a && a.until > now && a.n >= max) throw new AppError("RATE_LIMITED", "Слишком много попыток. Попробуйте через несколько минут.");
  if (!a || a.until <= now) attempts.set(key, { n: 1, until: now + windowMs });
  else a.n++;
}
export function resetRate(key: string) {
  attempts.delete(key);
}

export async function authenticate(input: z.infer<typeof loginSchema>) {
  const where = identifierWhere(input.login);
  const user = where ? await db.user.findFirst({ where, include: { role: true } }) : null;
  // Проверяем пароль даже при отсутствии пользователя, чтобы не выдавать его существование по времени ответа
  const ok = await verifyPassword(input.password, user?.passwordHash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !ok || !user.isActive) throw new AppError("UNAUTHORIZED", "Неверный логин или пароль");
  return user;
}

export async function requestPasswordReset(login: string, appUrl: string) {
  const where = identifierWhere(login.trim());
  const user = where ? await db.user.findFirst({ where }) : null;
  // Ответ одинаковый вне зависимости от существования аккаунта
  if (!user) return;
  const token = randomToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
  });
  const link = `${appUrl}/account/reset?token=${token}`;
  if (user.email) {
    await queueMessage("email", user.email, "Восстановление доступа B&A SMART", `Чтобы задать новый пароль, перейдите по ссылке: ${link}\nСсылка действует 1 час.`);
  } else if (user.phone) {
    await queueMessage("sms", user.phone, null, `B&A SMART: восстановление доступа ${link}`);
  }
}

export async function resetPassword(token: string, newPassword: string) {
  password.parse(newPassword);
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new AppError("BAD_REQUEST", "Ссылка недействительна или устарела");
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(newPassword) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
}

export async function changePassword(userId: string, current: string, next: string) {
  password.parse(next);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(current, user.passwordHash))) throw new AppError("VALIDATION", "Текущий пароль указан неверно", { field: "current" });
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
}

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email("Некорректный email").max(120).optional().or(z.literal("").transform(() => undefined)),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  locale: z.enum(["ru", "kk"]).optional(),
});

export async function updateProfile(userId: string, input: z.infer<typeof profileSchema>) {
  if (input.email) {
    const other = await db.user.findFirst({ where: { email: input.email.toLowerCase(), id: { not: userId } } });
    if (other) throw new AppError("CONFLICT", "Этот email уже используется", { field: "email" });
  }
  return db.user.update({
    where: { id: userId },
    data: { name: input.name, email: input.email?.toLowerCase() ?? null, city: input.city || null, address: input.address || null, locale: input.locale },
    select: { id: true, name: true, email: true, phone: true, city: true, address: true, locale: true },
  });
}
