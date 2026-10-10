import { cookies } from "next/headers";
import { handler } from "@/lib/api";
import { destroyCurrentSession } from "@/server/auth/session";
import { CART_COOKIE } from "@/server/request";

export const POST = handler(async () => {
  await destroyCurrentSession();
  (await cookies()).delete(CART_COOKIE);
  return { ok: true };
});
