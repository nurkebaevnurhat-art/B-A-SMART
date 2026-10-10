import { AppError } from "@/lib/errors";
import type { PaymentProvider } from "./types";

/**
 * Заготовки для реальных провайдеров Казахстана. Чтобы включить провайдера:
 *  1. Заключить договор (интернет-эквайринг) и получить тестовые/боевые доступы.
 *  2. Реализовать createSession (создание платежа по API провайдера и URL перехода к оплате)
 *     и parseWebhook (проверка подписи/токена уведомления по документации провайдера).
 *  3. Задать PAYMENT_PROVIDER и ключи в переменных окружения (см. .env.example).
 *
 * Кандидаты: Halyk ePay (epayment.kz), Kaspi Pay (через партнёрский договор с Kaspi),
 * Freedom Pay (бывш. PayBox), CloudPayments Казахстан. Условия и доступность API нужно
 * подтвердить у провайдера до разработки — здесь намеренно нет «выдуманных» вызовов API.
 */
function notConfigured(code: string, title: string): PaymentProvider {
  return {
    code,
    isTest: false,
    async createSession() {
      throw new AppError("DISABLED", `${title}: интеграция не подключена. Нужны договор и ключи доступа.`);
    },
    async parseWebhook() {
      throw new AppError("DISABLED", `${title}: интеграция не подключена.`);
    },
  };
}

export const halykProvider = notConfigured("halyk", "Halyk ePay");
export const kaspiProvider = notConfigured("kaspi", "Kaspi Pay");
export const freedomProvider = notConfigured("freedom", "Freedom Pay");
