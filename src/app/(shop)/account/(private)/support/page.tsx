import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageUser } from "@/server/guards";
import { SupportForm } from "@/components/account/SupportForm";
import { Badge } from "@/components/ui/Badge";

export default async function SupportPage() {
  const user = await pageUser("/account/support");
  const [tickets, orders] = await Promise.all([
    db.supportTicket.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { order: { select: { number: true } } } }),
    db.order.findMany({ where: { userId: user.id }, select: { number: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <div className="grid gap-12 xl:grid-cols-2">
      <section>
        <h2 className="mb-6 font-sans text-xl font-semibold">Новое обращение</h2>
        <SupportForm orders={orders.map((o) => o.number)} />
      </section>
      <section>
        <h2 className="mb-6 font-sans text-xl font-semibold">Мои обращения</h2>
        {tickets.length ? (
          <ul className="space-y-3">
            {tickets.map((tk) => (
              <li key={tk.id} className="rounded-2xl border border-line p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{tk.subject}</span>
                  <Badge tone={tk.status === "ANSWERED" ? "success" : tk.status === "CLOSED" ? "muted" : "accent"}>{tk.status === "OPEN" ? "Открыто" : tk.status === "ANSWERED" ? "Есть ответ" : "Закрыто"}</Badge>
                </div>
                <p className="mt-2 text-sm text-graphite">{tk.message}</p>
                {tk.reply && <p className="mt-3 rounded-xl bg-surface p-3 text-sm"><b>Ответ:</b> {tk.reply}</p>}
                <p className="mt-2 text-xs text-muted">{formatDateTime(tk.createdAt)}{tk.order ? ` · заказ ${tk.order.number}` : ""}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-graphite">Обращений пока нет.</p>
        )}
      </section>
    </div>
  );
}
