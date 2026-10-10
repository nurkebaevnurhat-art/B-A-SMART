import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { resetPassword } from "@/server/services/auth";

export const POST = handler(async (req) => {
  const { token, password } = await parseBody(req, z.object({ token: z.string().min(10).max(200), password: z.string().max(128) }));
  await resetPassword(token, password);
  return { ok: true };
});
