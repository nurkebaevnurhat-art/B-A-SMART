import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";
import type { CreateSessionInput, PaymentProvider, WebhookEvent } from "./types";

/**
 * ТЕСТОВЫЙ провайдер. Настоящие деньги не списываются.
 * Покупатель попадает на страницу /pay/test/:paymentId, где имитирует успех/отказ/отмену.
 * Уведомление подписывается HMAC-SHA256 так же, как это делают реальные провайдеры,
 * и проходит тот же путь обработки, что и боевой вебхук.
 */
export function mockSecret() {
  return process.env.MOCK_PAYMENT_SECRET || process.env.SESSION_SECRET || "dev-mock-secret";
}

export function signMock(body: string) {
  return createHmac("sha256", mockSecret()).update(body).digest("hex");
}

export const mockProvider: PaymentProvider = {
  code: "mock",
  isTest: true,
  async createSession(input: CreateSessionInput) {
    return { providerPaymentId: `mock_${input.paymentId}`, redirectUrl: `/pay/test/${input.paymentId}` };
  },
  async parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent> {
    const sig = headers.get("x-signature") ?? "";
    const expected = signMock(rawBody);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AppError("FORBIDDEN", "Неверная подпись уведомления");
    const data = JSON.parse(rawBody) as WebhookEvent;
    if (!data.eventId || !data.providerPaymentId || !["SUCCEEDED", "FAILED", "CANCELLED"].includes(data.status)) {
      throw new AppError("BAD_REQUEST", "Некорректное уведомление");
    }
    return data;
  },
};
