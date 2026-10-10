import { z } from "zod";
import { appUrl, handler, parseBody } from "@/lib/api";
import { getOrderForCustomer } from "@/server/services/orders";
import { startPayment } from "@/server/services/payments";
import { getCurrentUser } from "@/server/auth/session";

/** Создание платёжной сессии; клиент переходит по redirectUrl на страницу провайдера */
export const POST = handler<{ number: string }>(async (req, { number }) => {
  const { token } = await parseBody(req, z.object({ token: z.string().optional() }));
  const user = await getCurrentUser();
  const order = await getOrderForCustomer(number, { userId: user?.id, token });
  const payment = await startPayment(order.id, appUrl(req));
  return { paymentId: payment.id, redirectUrl: payment.redirectUrl, isTest: payment.isTest };
});
