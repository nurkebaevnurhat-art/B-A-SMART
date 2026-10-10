export type ProviderPaymentStatus = "SUCCEEDED" | "FAILED" | "CANCELLED";

export type CreateSessionInput = {
  paymentId: string;
  orderNumber: string;
  amount: number; // тенге
  description: string;
  returnUrl: string;
  webhookUrl: string;
};

export type CreateSessionResult = { providerPaymentId: string; redirectUrl: string };

export type WebhookEvent = {
  eventId: string;
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  amount: number;
  reason?: string;
};

/**
 * Интерфейс платёжного провайдера.
 * Реальные провайдеры (Halyk ePay, Kaspi Pay, Freedom Pay, CloudPayments и др.) подключаются
 * отдельными реализациями после заключения договора и получения доступов.
 */
export interface PaymentProvider {
  readonly code: string;
  readonly isTest: boolean;
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  /** Проверка подписи и разбор входящего уведомления. Бросает ошибку при неверной подписи. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent>;
}
