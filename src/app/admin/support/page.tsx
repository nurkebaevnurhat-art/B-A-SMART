import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel, FArea, FSelect } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { replyTicket } from "../_actions/marketing";

export default async function Support() {
  await pageStaff("support.write", "/admin/support");
  const tickets = await db.supportTicket.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 100, include: { user: { select: { name: true, phone: true } }, order: { select: { number: true } } } });
  return (
    <>
      <PageHeader title="Обращения в поддержку" />
      <div className="space-y-4">
        {tickets.map((t) => (
          <Panel key={t.id} title={t.subject} actions={<span className="text-xs text-muted">{t.user.name} · {formatDateTime(t.createdAt)}{t.order ? ` · заказ ${t.order.number}` : ""}</span>}>
            <p className="text-sm text-graphite">{t.message}</p>
            <ActionForm action={replyTicket} submitLabel="Сохранить ответ" className="mt-3">
              <input type="hidden" name="id" value={t.id} />
              <FArea label="Ответ" name="reply" defaultValue={t.reply} />
              <div className="mt-2 max-w-xs"><FSelect label="Статус" name="status" defaultValue={t.status === "OPEN" ? "ANSWERED" : t.status} options={[{ value: "OPEN", label: "Открыто" }, { value: "ANSWERED", label: "Есть ответ" }, { value: "CLOSED", label: "Закрыто" }]} /></div>
            </ActionForm>
          </Panel>
        ))}
        {!tickets.length && <p className="text-muted">Обращений нет.</p>}
      </div>
    </>
  );
}
