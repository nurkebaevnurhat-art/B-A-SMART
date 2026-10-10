import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel, Stat, Table, Td } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await pageStaff("dashboard.read");
  const sp = await searchParams;
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const paidStatuses = ["PAID", "CONFIRMED", "ASSEMBLING", "SHIPPED", "DELIVERED", "COMPLETED"] as const;
  const [today, week, newOrders, awaiting, lowStock, usedAvail, apps, reviews, tickets, latest] = await Promise.all([
    db.order.aggregate({ where: { createdAt: { gte: dayStart }, status: { not: "CANCELLED" } }, _count: true, _sum: { total: true } }),
    db.order.aggregate({ where: { createdAt: { gte: weekAgo }, status: { in: [...paidStatuses] } }, _count: true, _sum: { total: true } }),
    db.order.count({ where: { status: "NEW" } }),
    db.order.count({ where: { status: "AWAITING_PAYMENT" } }),
    db.productVariant.findMany({ where: { isActive: true, stock: { lte: 1 }, product: { status: "PUBLISHED" } }, include: { product: { select: { name: true, id: true } } }, take: 8, orderBy: { stock: "asc" } }),
    db.usedUnit.count({ where: { status: "AVAILABLE" } }),
    db.installmentApplication.count({ where: { status: "NEW" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.supportTicket.count({ where: { status: "OPEN" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  return (
    <>
      <PageHeader title="Показатели" description="Сводка по магазину" />
      {sp.denied && <p className="mb-6 rounded-xl bg-danger/5 p-4 text-sm text-danger">Недостаточно прав для этого раздела.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Заказы сегодня" value={today._count} hint={formatPrice(today._sum.total ?? 0)} href="/admin/orders" />
        <Stat label="Выручка за 7 дней (оплаченные/подтверждённые)" value={formatPrice(week._sum.total ?? 0)} hint={`${week._count} заказов`} />
        <Stat label="Новые заказы" value={newOrders} hint={`Ожидают оплаты: ${awaiting}`} href="/admin/orders?status=NEW" />
        <Stat label="Б/у в продаже" value={usedAvail} href="/admin/used" />
        <Stat label="Заявки на рассрочку" value={apps} hint="новые" href="/admin/installments" />
        <Stat label="Отзывы на модерации" value={reviews} href="/admin/reviews" />
        <Stat label="Открытые обращения" value={tickets} href="/admin/support" />
        <Stat label="Мало на складе" value={lowStock.length} hint="вариантов с остатком ≤ 1" href="/admin/inventory?low=1" />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Последние заказы" actions={<Link href="/admin/orders" className="text-sm text-primary">Все →</Link>}>
          <Table head={["№", "Покупатель", "Сумма", "Статус", "Дата"]} empty={!latest.length}>
            {latest.map((o) => (
              <tr key={o.id}>
                <Td><Link href={`/admin/orders/${o.id}`} className="font-medium text-primary">{o.number}</Link></Td>
                <Td>{o.customerName}</Td>
                <Td>{formatPrice(o.total)}</Td>
                <Td><OrderStatusBadge status={o.status} /></Td>
                <Td className="text-muted">{formatDateTime(o.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Заканчиваются">
          <ul className="divide-y divide-line text-sm">
            {lowStock.map((v) => (
              <li key={v.id} className="flex justify-between gap-2 py-2.5">
                <Link href={`/admin/products/${v.product.id}`} className="hover:text-primary">{v.product.name} {[v.color, v.storageGb && `${v.storageGb} ГБ`].filter(Boolean).join(", ")}</Link>
                <span className={v.stock === 0 ? "text-danger" : "text-accent-dark"}>{v.stock} шт.</span>
              </li>
            ))}
            {!lowStock.length && <li className="py-2 text-muted">Всё в наличии</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
