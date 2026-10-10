import { handler, ok } from "@/lib/api";
import { handleWebhook } from "@/server/services/payments";

/** Уведомления платёжного провайдера. Подпись проверяется, повторы игнорируются. */
export const POST = handler<{ provider: string }>(async (req, { provider }) => {
  const raw = await req.text();
  const res = await handleWebhook(provider, raw, req.headers);
  return ok(res);
});
