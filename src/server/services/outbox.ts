import { db } from "@/lib/db";

/**
 * Очередь исходящих сообщений. Пока SMTP/SMS-провайдер не подключён, сообщения
 * сохраняются в БД со статусом PENDING и видны администратору (раздел «Настройки → Уведомления»).
 */
export async function queueMessage(channel: "email" | "sms", to: string, subject: string | null, body: string) {
  await db.outboxMessage.create({ data: { channel, to, subject, body } });
  if (process.env.NODE_ENV !== "production") {
    console.info(`[outbox:${channel}] → ${to}: ${subject ?? ""}\n${body}`);
  }
}
