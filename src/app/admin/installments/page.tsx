import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatPhone, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { getSetting } from "@/server/services/settings";
import { APPLICATION_STATUS_LABELS } from "@/server/services/installment";
import { PageHeader, Panel, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export default async function Installments() {
  await pageStaff("installments.read", "/admin/installments");
  const [apps, contracts, s] = await Promise.all([
    db.installmentApplication.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.installmentContract.findMany({ orderBy: { createdAt: "desc" }, include: { schedule: true, application: { select: { itemName: true, fullName: true } } } }),
    getSetting("installment"),
  ]);
  return (
    <>
      <PageHeader title="Халяльная рассрочка" description="Заявки, договоры и графики платежей" actions={<Link href="/admin/settings#installment" className="text-sm text-primary">Условия программы →</Link>} />
      {(s.isDemo || !s.contractsEnabled) && (
        <p className="mb-6 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm">
          {s.isDemo && "Программа в демонстрационном режиме. "}
          {!s.contractsEnabled && "Заключение договоров отключено до проверки модели сделки специалистом по исламским финансам и юристом."}
        </p>
      )}
      <Table head={["№", "Дата", "Заявитель", "Товар", "Цена / взнос", "Срок", "Статус"]} empty={!apps.length}>
        {apps.map((a) => (
          <tr key={a.id}>
            <Td><Link href={`/admin/installments/${a.id}`} className="font-medium text-primary">{a.number}</Link>{a.isDemo && <Badge tone="outline" className="ml-2">демо</Badge>}</Td>
            <Td className="text-muted">{formatDate(a.createdAt)}</Td>
            <Td>{a.fullName}<div className="text-xs text-muted">{formatPhone(a.phone)} · {a.city}</div></Td>
            <Td>{a.itemName}</Td>
            <Td>{formatPrice(a.totalPrice)}<div className="text-xs text-muted">взнос {formatPrice(a.downPayment)}</div></Td>
            <Td>{a.termMonths} мес. × {formatPrice(a.monthlyAmount)}</Td>
            <Td><Badge tone={a.status === "APPROVED" ? "success" : a.status === "REJECTED" ? "danger" : "accent"}>{APPLICATION_STATUS_LABELS[a.status]}</Badge></Td>
          </tr>
        ))}
      </Table>
      <Panel title={`Договоры и графики (${contracts.length})`} className="mt-6">
        <ul className="divide-y divide-line text-sm">
          {contracts.map((c) => {
            const paid = c.schedule.filter((x) => x.status === "PAID").length;
            const overdue = c.schedule.filter((x) => x.status === "PENDING" && x.dueDate < new Date()).length;
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/admin/installments/${c.applicationId}`} className="text-primary">{c.number} · {c.application.fullName} · {c.application.itemName}</Link>
                <span className="flex items-center gap-2">
                  {c.isDemo && <Badge tone="outline">демо</Badge>}
                  {overdue > 0 && <Badge tone="danger">просрочено: {overdue}</Badge>}
                  <span>{paid}/{c.schedule.length} платежей</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
