import { z } from "zod";
import { appUrl, handler, parseBody } from "@/lib/api";
import { checkRate, requestPasswordReset } from "@/server/services/auth";

export const POST = handler(async (req) => {
  const { login } = await parseBody(req, z.object({ login: z.string().trim().min(3).max(120) }));
  checkRate(`forgot:${login.toLowerCase()}`, 5, 60 * 60_000);
  await requestPasswordReset(login, appUrl(req));
  // Одинаковый ответ, чтобы не раскрывать наличие аккаунта
  return { ok: true };
});
