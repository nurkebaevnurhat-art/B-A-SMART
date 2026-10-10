import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateTime, formatPhone, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { ORDER_STATUS_LABELS } from "@/server/services/orders";
import { PageHeader, SearchBar, Table, Td } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await pageStaff("orders.read", "/admin/orders");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const digits = sp.q?.replace(/\D/g, "");
  const where: Prisma.OrderWhereInput = {
    ...(sp.status ? { status: sp.status as OrderStatus } : {}),
    ...(sp.q ? { OR: [{ number: { contains: sp.q, mode: "insensitive" } }, { customerName: { contains: sp.q, mode: "insensitive" } }, ...(digits && digits.length >= 4 ? [{ phone: { contains: digits.slice(-10) } }] : [])] } : {}),
  };
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  return (
    <>
      <PageHeader title="Заказы" description={`Найдено: ${total}`} />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/orders" className={`rounded-full px-3 py-1.5 ${!sp.status ? "bg-ink text-white" : "bg-white"}`}>Все</Link>
        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => {
          const n = counts.find((c) => c.status === s)?._count ?? 0;
          return (
            <Link key={s} href={`/admin/orders?status=${s}`} className={`rounded-full px-3 py-1.5 ${sp.status === s ? "bg-ink text-white" : "bg-white"}`}>
              {ORDER_STATUS_LABELS[s]} {n > 0 && <span className="opacity-60">{n}</span>}
            </Link>
          );
        })}
      </div>
      <SearchBar placeholder="Номер заказа, имя или телефон" defaultValue={sp.q}>{sp.status && <input type="hidden" name="status" value={sp.status} />}</SearchBar>
      <Table head={["№", "Дата", "Покупатель", "Позиций", "Оплата", "Сумма", "Статус"]} empty={!orders.length}>
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-surface/60">
            <Td><Link href={`/admin/orders/${o.id}`} className="font-medium text-primary">{o.number}</Link></Td>
            <Td className="text-muted">{formatDateTime(o.createdAt)}</Td>
            <Td>{o.customerName}<div className="text-xs text-muted">{formatPhone(o.phone)}</div></Td>
            <Td>{o._count.items}</Td>
            <Td>{o.paymentMethod === "ONLINE" ? "Онлайн" : "При получении"}</Td>
            <Td className="font-medium">{formatPrice(o.total)}</Td>
            <Td><OrderStatusBadge status={o.status} /></Td>
          </tr>
        ))}
      </Table>
      {total > 50 && (
        <div className="mt-4 flex gap-2 text-sm">
          {page > 1 && <Link href={`?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(page - 1) })}`} className="rounded-lg border border-line bg-white px-3 py-1.5">←</Link>}
          <span className="px-2 py-1.5">Стр. {page}</span>
          {page * 50 < total && <Link href={`?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(page + 1) })}`} className="rounded-lg border border-line bg-white px-3 py-1.5">→</Link>}
        </div>
      )}
    </>
  );
}
