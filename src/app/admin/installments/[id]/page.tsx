import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatPhone, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { hasPermission } from "@/server/auth/permissions";
import { getSetting } from "@/server/services/settings";
import { APPLICATION_STATUS_LABELS } from "@/server/services/installment";
import { PageHeader, Panel, F, FArea, FSelect } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { createContractAction, markSchedulePaid, setApplicationStatus } from "../../_actions/marketing";

export default async function Application({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageStaff("installments.read", `/admin/installments/${id}`);
  const [a, s] = await Promise.all([
    db.installmentApplication.findUnique({ where: { id }, include: { contract: { include: { schedule: { orderBy: { seq: "asc" } } } }, product: { select: { name: true } } } }),
    getSetting("installment"),
  ]);
  if (!a) notFound();
  const canWrite = hasPermission(user, "installments.write");
  return (
    <>
      <PageHeader title={`Заявка ${a.number}`} back={{ href: "/admin/installments", label: "Рассрочка" }} description={<span className="flex gap-2"><Badge tone="accent">{APPLICATION_STATUS_LABELS[a.status]}</Badge>{a.isDemo && <Badge tone="outline">демо</Badge>} {formatDateTime(a.createdAt)}</span>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Заявка">
          <dl className="grid grid-cols-[180px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Заявитель</dt><dd>{a.fullName}</dd>
            <dt className="text-muted">Телефон</dt><dd><a href={`tel:${a.phone}`} className="text-primary">{formatPhone(a.phone)}</a></dd>
            <dt className="text-muted">Город</dt><dd>{a.city}</dd>
            <dt className="text-muted">Товар</dt><dd>{a.itemName}</dd>
            <dt className="text-muted">Цена товара</dt><dd>{formatPrice(a.price)}</dd>
            <dt className="text-muted">Фикс. наценка</dt><dd>{formatPrice(a.markup)}</dd>
            <dt className="text-muted">Полная цена</dt><dd className="font-semibold">{formatPrice(a.totalPrice)}</dd>
            <dt className="text-muted">Взнос</dt><dd>{formatPrice(a.downPayment)}</dd>
            <dt className="text-muted">Срок / платёж</dt><dd>{a.termMonths} мес. × {formatPrice(a.monthlyAmount)}</dd>
            <dt className="text-muted">Согласие на ПДн</dt><dd>{formatDateTime(a.consentAt)}</dd>
            {a.comment && <><dt className="text-muted">Комментарий</dt><dd>{a.comment}</dd></>}
          </dl>
          {canWrite && (
            <ActionForm action={setApplicationStatus} submitLabel="Сохранить" className="mt-6 border-t border-line pt-4">
              <input type="hidden" name="id" value={a.id} />
              <FSelect label="Статус" name="status" defaultValue={a.status} options={Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
              <div className="mt-3"><FArea label="Заметка менеджера" name="managerNote" defaultValue={a.managerNote} /></div>
            </ActionForm>
          )}
        </Panel>
        <Panel title="Договор и график">
          {a.contract ? (
            <>
              <p className="mb-3 text-sm">Договор <b>{a.contract.number}</b> от {formatDate(a.contract.startDate)} {a.contract.isDemo && <Badge tone="outline">демо</Badge>}</p>
              <table className="w-full text-sm">
                <tbody>
                  {a.contract.schedule.map((it) => (
                    <tr key={it.id} className="border-t border-line">
                      <td className="py-2">{it.seq}</td>
                      <td>{formatDate(it.dueDate)}</td>
                      <td>{formatPrice(it.amount)}</td>
                      <td className={it.status === "PAID" ? "text-success" : it.dueDate < new Date() ? "text-danger" : ""}>{it.status === "PAID" ? `оплачен ${it.paidAt ? formatDate(it.paidAt) : ""}` : it.dueDate < new Date() ? "просрочен" : "ожидается"}</td>
                      <td className="text-right">
                        {canWrite && (
                          <ActionForm action={markSchedulePaid} submitLabel={it.status === "PAID" ? "Снять" : "Оплачен"} inline submitVariant="ghost">
                            <input type="hidden" name="id" value={it.id} />
                            <input type="hidden" name="paid" value={it.status === "PAID" ? "0" : "1"} />
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted">Отметка об оплате не начисляет штрафов и не меняет сумму договора.</p>
            </>
          ) : s.contractsEnabled ? (
            canWrite && a.status === "APPROVED" ? (
              <ActionForm action={createContractAction} submitLabel="Создать договор и график">
                <input type="hidden" name="applicationId" value={a.id} />
                <F label="Дата договора" name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </ActionForm>
            ) : (
              <p className="text-sm text-muted">Договор можно создать после одобрения заявки.</p>
            )
          ) : (
            <p className="rounded-xl bg-surface p-4 text-sm text-graphite">Заключение договоров отключено в настройках программы до проверки модели сделки специалистом по исламским финансам и юристом.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
