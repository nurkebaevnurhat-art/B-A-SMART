import { ZodError, type ZodTypeAny, type z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { requirePermission, type CurrentUser } from "@/server/auth/session";
import type { Permission } from "@/server/auth/permissions";

export type ActionState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string>; redirect?: string } | null;

/** FormData → объект. Повторяющиеся ключи (name="x[]") становятся массивами, пустые строки — undefined. */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of fd.entries()) {
    if (rawKey.startsWith("$ACTION")) continue;
    const isArr = rawKey.endsWith("[]");
    const key = isArr ? rawKey.slice(0, -2) : rawKey;
    const v = typeof value === "string" ? (value.trim() === "" ? undefined : value.trim()) : value;
    if (isArr) {
      const arr = (out[key] as unknown[]) ?? [];
      if (v !== undefined) arr.push(v);
      out[key] = arr;
    } else out[key] = v;
  }
  return out;
}

export function describeError(e: unknown): ActionState {
  if (e instanceof AppError) return { error: e.message };
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const i of e.issues) fields[i.path.join(".")] ??= i.message;
    return { error: `Проверьте поля: ${Object.entries(fields).map(([k, v]) => `${k} — ${v}`).join("; ")}`, fields };
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Значение должно быть уникальным (такая запись уже существует)" };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") return { error: "Нельзя удалить: запись используется в других данных" };
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
  console.error(e);
  return { error: "Ошибка сервера. Попробуйте ещё раз." };
}

/**
 * Обёртка серверного действия админ-панели:
 * проверка прав на сервере → валидация → выполнение → сброс кэша страниц.
 */
export function adminAction<S extends ZodTypeAny>(
  perm: Permission,
  schema: S,
  fn: (data: z.infer<S>, user: CurrentUser, fd: FormData) => Promise<string | ActionState | void>,
  revalidate: string[] = [],
) {
  return async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
    try {
      const user = await requirePermission(perm);
      const data = schema.parse(formToObject(fd));
      const res = await fn(data, user, fd);
      for (const p of revalidate) revalidatePath(p, "layout");
      if (res && typeof res === "object") return { ok: true, ...res };
      return { ok: true, message: res || "Сохранено" };
    } catch (e) {
      return describeError(e);
    }
  };
}

export const checkbox = (v: unknown) => v === "on" || v === "true" || v === true;
