import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime, formatPhone, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { hasPermission } from "@/server/auth/permissions";
import { allowedTransitions, ORDER_STATUS_LABELS, orderDetailInclude } from "@/server/services/orders";
import { PageHeader, Panel, Table, Td, F, FSelect } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { PAYMENT_STATUS } from "@/components/admin/labels";
import { updateOrderStatus, updateShipment } from "../../_actions/orders";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageStaff("orders.read", `/admin/orders/${id}`);
  const order = await db.order.findUnique({ where: { id }, include: { ...orderDetailInclude, user: { select: { id: true, name: true, email: true } } } });
  if (!order) notFound();
  const [delivery, actors] = await Promise.all([
    db.deliveryOption.findUnique({ where: { code: order.deliveryCode } }),
    db.user.findMany({ where: { id: { in: order.history.map((h) => h.actorId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
  ]);
  const canWrite = hasPermission(user, "orders.write");
  const next = allowedTransitions(order.status).filter((s) => !(s === "PAID" && order.paymentMethod === "ONLINE"));
  return (
    <>
      <PageHeader title={`Заказ ${order.number}`} back={{ href: "/admin/orders", label: "Заказы" }} description={<span className="flex items-center gap-2"><OrderStatusBadge status={order.status} /> {formatDateTime(order.createdAt)}</span>} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Состав заказа">
            <Table head={["Товар", "SKU / №", "Цена", "Кол-во", "Сумма"]}>
              {order.items.map((it) => (
                <tr key={it.id}>
                  <Td>{it.name}</Td>
                  <Td className="font-mono text-xs">{it.usedUnit ? <Link href={`/admin/used/${it.usedUnitId}`} className="text-primary">{it.sku}</Link> : it.sku}</Td>
                  <Td>{formatPrice(it.unitPrice)}</Td>
                  <Td>{it.quantity}</Td>
                  <Td className="font-medium">{formatPrice(it.total)}</Td>
                </tr>
              ))}
            </Table>
            <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Товары</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Скидка {order.promoCode?.code}</dt><dd>−{formatPrice(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Доставка</dt><dd>{formatPrice(order.deliveryCost)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1 text-base font-semibold"><dt>Итого</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </Panel>
          <Panel title="История статусов">
            <ol className="space-y-2 text-sm">
              {order.history.map((h) => (
                <li key={h.id} className="flex flex-wrap gap-x-3">
                  <span className="text-muted">{formatDateTime(h.createdAt)}</span>
                  <span className="font-medium">{h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus]} → ` : ""}{ORDER_STATUS_LABELS[h.toStatus]}</span>
                  <span className="text-muted">{h.actorId ? actors.find((a) => a.id === h.actorId)?.name ?? "сотрудник" : "система"}</span>
                  {h.comment && <span className="w-full text-graphite">{h.comment}</span>}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Платежи">
            {order.payments.length ? (
              <ul className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3">
                    <Badge tone={PAYMENT_STATUS[p.status][1]}>{PAYMENT_STATUS[p.status][0]}</Badge>
                    <span>{formatPrice(p.amount)}</span>
                    <span className="text-muted">{p.provider}{p.isTest ? " (тест)" : ""} · {formatDateTime(p.createdAt)}</span>
                    {p.failureReason && <span className="text-danger">{p.failureReason}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{order.paymentMethod === "ONLINE" ? "Платёж ещё не создавался" : "Оплата при получении"}</p>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          {canWrite && next.length > 0 && (
            <Panel title="Изменить статус">
              <ActionForm action={updateOrderStatus} submitLabel="Применить" confirm="Изменить статус заказа?">
                <input type="hidden" name="id" value={order.id} />
                <FSelect label="Новый статус" name="status" options={next.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))} />
                <div className="mt-3"><F label="Комментарий" name="comment" /></div>
                {next.includes("CANCELLED") && <p className="mt-2 text-xs text-muted">При отмене остатки и б/у экземпляры автоматически возвращаются в продажу.</p>}
              </ActionForm>
            </Panel>
          )}
          <Panel title="Покупатель">
            <p className="font-medium">{order.customerName}</p>
            <p className="text-sm"><a href={`tel:${order.phone}`} className="text-primary">{formatPhone(order.phone)}</a>{order.email ? ` · ${order.email}` : ""}</p>
            {order.user ? <Link href={`/admin/customers/${order.user.id}`} className="mt-1 inline-block text-sm text-primary">Аккаунт: {order.user.name}</Link> : <p className="mt-1 text-sm text-muted">Гостевой заказ</p>}
            {order.comment && <p className="mt-3 rounded-lg bg-surface p-3 text-sm">{order.comment}</p>}
          </Panel>
          <Panel title="Доставка">
            <p className="text-sm">{delivery?.nameRu ?? order.deliveryCode} · {order.city}{order.address ? `, ${order.address}` : ""}</p>
            {canWrite && order.shipment && (
              <ActionForm action={updateShipment} submitLabel="Сохранить" className="mt-3">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="grid gap-3">
                  <FSelect label="Статус доставки" name="status" defaultValue={order.shipment.status} options={[{ value: "PENDING", label: "Ожидает" }, { value: "READY_FOR_PICKUP", label: "Готов к выдаче" }, { value: "IN_TRANSIT", label: "В пути" }, { value: "DELIVERED", label: "Доставлен" }, { value: "RETURNED", label: "Возврат" }]} />
                  <F label="Служба доставки" name="carrier" defaultValue={order.shipment.carrier} />
                  <F label="Трек-номер" name="trackingNumber" defaultValue={order.shipment.trackingNumber} />
                </div>
              </ActionForm>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
