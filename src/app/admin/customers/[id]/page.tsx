import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatPhone, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel, Table, Td } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pageStaff("customers.read", `/admin/customers/${id}`);
  const u = await db.user.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: "desc" } }, installmentApps: { orderBy: { createdAt: "desc" } }, role: true } });
  if (!u) notFound();
  const spent = u.orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
  return (
    <>
      <PageHeader title={u.name} back={{ href: "/admin/customers", label: "Покупатели" }} description={`${u.phone ? formatPhone(u.phone) : ""} ${u.email ?? ""} · с ${formatDate(u.createdAt)} · ${u.role.name}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Заказы (${u.orders.length}) · ${formatPrice(spent)}`}>
          <Table head={["№", "Дата", "Сумма", "Статус"]} empty={!u.orders.length}>
            {u.orders.map((o) => (
              <tr key={o.id}>
                <Td><Link href={`/admin/orders/${o.id}`} className="text-primary">{o.number}</Link></Td>
                <Td>{formatDate(o.createdAt)}</Td>
                <Td>{formatPrice(o.total)}</Td>
                <Td><OrderStatusBadge status={o.status} /></Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title={`Заявки на рассрочку (${u.installmentApps.length})`}>
          <ul className="space-y-2 text-sm">
            {u.installmentApps.map((a) => <li key={a.id}><Link href={`/admin/installments/${a.id}`} className="text-primary">{a.number}</Link> · {a.itemName} · {a.status}</li>)}
          </ul>
        </Panel>
      </div>
    </>
  );
}
