import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { changePassword } from "@/server/services/auth";
import { requireUser } from "@/server/auth/session";

export const POST = handler(async (req) => {
  const user = await requireUser();
  const { current, next } = await parseBody(req, z.object({ current: z.string().max(128), next: z.string().max(128) }));
  await changePassword(user.id, current, next);
  return { ok: true };
});
