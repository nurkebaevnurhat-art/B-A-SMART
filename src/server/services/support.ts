import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Укажите тему").max(150),
  message: z.string().trim().min(10, "Опишите вопрос подробнее").max(3000),
  orderNumber: z.string().trim().max(30).optional(),
});

export async function createTicket(userId: string, input: z.infer<typeof ticketSchema>) {
  let orderId: string | null = null;
  if (input.orderNumber) {
    const order = await db.order.findFirst({ where: { number: input.orderNumber, userId } });
    if (!order) throw new AppError("VALIDATION", "Заказ с таким номером не найден в вашем аккаунте", { field: "orderNumber" });
    orderId = order.id;
  }
  return db.supportTicket.create({ data: { userId, orderId, subject: input.subject, message: input.message } });
}
