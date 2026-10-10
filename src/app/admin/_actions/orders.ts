"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { type ActionState, adminAction } from "@/server/admin/action";
import { changeOrderStatus } from "@/server/services/orders";
import { audit } from "@/server/services/audit";

const _updateOrderStatus = adminAction(
  "orders.write",
  z.object({
    id: z.string(),
    status: z.enum(["NEW", "AWAITING_PAYMENT", "PAID", "CONFIRMED", "ASSEMBLING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"]),
    comment: z.string().max(500).optional(),
  }),
  async (d, user) => {
    if (d.status === "PAID") {
      // Ручная отметка оплаты допустима только для оплаты при получении
      const o = await db.order.findUniqueOrThrow({ where: { id: d.id } });
      if (o.paymentMethod === "ONLINE") throw new AppError("VALIDATION", "Онлайн-оплата подтверждается только платёжным сервисом");
    }
    await changeOrderStatus(d.id, d.status, { actorId: user.id, comment: d.comment });
    await audit(user.id, "order.status", "Order", d.id, { to: d.status, comment: d.comment ?? null });
    return "Статус обновлён";
  },
  ["/admin/orders", "/admin"],
);

const _updateShipment = adminAction(
  "orders.write",
  z.object({ orderId: z.string(), carrier: z.string().max(80).optional(), trackingNumber: z.string().max(80).optional(), status: z.enum(["PENDING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED", "RETURNED"]) }),
  async (d, user) => {
    await db.shipment.update({ where: { orderId: d.orderId }, data: { carrier: d.carrier ?? null, trackingNumber: d.trackingNumber ?? null, status: d.status } });
    await audit(user.id, "shipment.update", "Order", d.orderId, { status: d.status, trackingNumber: d.trackingNumber ?? null });
    return "Доставка обновлена";
  },
  ["/admin/orders"],
);

// Next.js требует явные async-функции в файлах "use server"
export async function updateOrderStatus(prev: ActionState, fd: FormData) {
  return _updateOrderStatus(prev, fd);
}
export async function updateShipment(prev: ActionState, fd: FormData) {
  return _updateShipment(prev, fd);
}
