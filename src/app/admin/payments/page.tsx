import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { paymentsAreTest } from "@/server/services/payments";
import { PageHeader, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { PAYMENT_STATUS } from "@/components/admin/labels";

export default async function Payments() {
  await pageStaff("payments.read", "/admin/payments");
  const payments = await db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { order: { select: { id: true, number: true } } } });
  const test = paymentsAreTest();
  return (
    <>
      <PageHeader title="Платежи" description={`Провайдер: ${process.env.PAYMENT_PROVIDER || "mock"}`} />
      {test && <p className="mb-5 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm">Включён тестовый режим оплаты: реальные платежи не принимаются. Для приёма оплаты нужен договор с платёжным провайдером и его ключи (см. README).</p>}
      <Table head={["Дата", "Заказ", "Провайдер", "ID у провайдера", "Сумма", "Статус"]} empty={!payments.length}>
        {payments.map((p) => (
          <tr key={p.id}>
            <Td className="text-muted">{formatDateTime(p.createdAt)}</Td>
            <Td><Link href={`/admin/orders/${p.order.id}`} className="text-primary">{p.order.number}</Link></Td>
            <Td>{p.provider}{p.isTest && <Badge tone="outline" className="ml-2">тест</Badge>}</Td>
            <Td className="font-mono text-xs">{p.providerPaymentId}</Td>
            <Td>{formatPrice(p.amount)}</Td>
            <Td><Badge tone={PAYMENT_STATUS[p.status][1]}>{PAYMENT_STATUS[p.status][0]}</Badge>{p.failureReason && <div className="text-xs text-danger">{p.failureReason}</div>}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
