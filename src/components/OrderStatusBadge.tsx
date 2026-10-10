import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/server/services/orders";
import { Badge } from "./ui/Badge";

const TONE: Record<OrderStatus, "accent" | "success" | "muted" | "danger" | "primary"> = {
  NEW: "accent",
  AWAITING_PAYMENT: "accent",
  PAID: "success",
  CONFIRMED: "primary",
  ASSEMBLING: "primary",
  SHIPPED: "primary",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
