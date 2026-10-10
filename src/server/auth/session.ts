import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { randomToken, sha256 } from "./password";
import { hasPermission, type Permission } from "./permissions";

export const SESSION_COOKIE = "ba_session";
const SESSION_DAYS = 30;

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof findUserByToken>>>;

async function findUserByToken(token: string) {
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  if (Date.now() - session.lastSeenAt.getTime() > 10 * 60_000) {
    db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  const { passwordHash: _omit, ...user } = session.user;
  void _omit;
  return { ...user, sessionId: session.id };
}

/** Создаёт сессию и возвращает открытый токен (сохраняется только хеш). */
export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { tokenHash: sha256(token), userId, userAgent: userAgent?.slice(0, 250), expiresAt } });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Токен из cookie (веб) или из заголовка Authorization: Bearer (мобильное приложение). */
export async function readSessionToken(): Promise<string | null> {
  const auth = (await headers()).get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await readSessionToken();
  if (!token) return null;
  return findUserByToken(token);
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Требуется вход в аккаунт");
  return user;
}

export async function requirePermission(perm: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasPermission(user, "admin.access") || !hasPermission(user, perm)) {
    throw new AppError("FORBIDDEN", "Недостаточно прав");
  }
  return user;
}

export async function destroyCurrentSession() {
  const token = await readSessionToken();
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  (await cookies()).delete(SESSION_COOKIE);
}
