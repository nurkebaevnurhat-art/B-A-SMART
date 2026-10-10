import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { formatDate, formatPrice } from "@/lib/format";
import { pageUser } from "@/server/guards";
import { APPLICATION_STATUS_LABELS } from "@/server/services/installment";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export default async function MyInstallmentsPage() {
  const user = await pageUser("/account/installments");
  const { locale, t } = await getDict();
  const [apps, contracts] = await Promise.all([
    db.installmentApplication.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.installmentContract.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { schedule: { orderBy: { seq: "asc" } }, application: { select: { itemName: true } } } }),
  ]);
  return (
    <div className="space-y-12">
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-sans text-xl font-semibold">Заявки</h2>
          <ButtonLink href="/installment" size="sm" variant="outline">Новая заявка</ButtonLink>
        </div>
        {apps.length ? (
          <ul className="space-y-3">
            {apps.map((a) => (
              <li key={a.id} className="rounded-2xl border border-line p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">№ {a.number}</span>
                  <span className="flex gap-2">{a.isDemo && <Badge tone="outline">демо</Badge>}<Badge tone={a.status === "APPROVED" ? "success" : a.status === "REJECTED" ? "danger" : "accent"}>{APPLICATION_STATUS_LABELS[a.status]}</Badge></span>
                </div>
                <p className="mt-2 text-graphite">{a.itemName}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatPrice(a.totalPrice)} · взнос {formatPrice(a.downPayment)} · {a.termMonths} {t.installment.months} × {formatPrice(a.monthlyAmount)} · {formatDate(a.createdAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-graphite">Заявок пока нет.</p>
        )}
      </section>

      <section>
        <h2 className="mb-6 font-sans text-xl font-semibold">{t.installment.schedule}</h2>
        {contracts.length ? (
          contracts.map((c) => {
            const paid = c.schedule.filter((s) => s.status === "PAID").reduce((s, x) => s + x.amount, 0);
            const total = c.schedule.reduce((s, x) => s + x.amount, 0);
            return (
              <div key={c.id} className="mb-6 rounded-3xl bg-surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">Договор {c.number}</div>
                    <div className="text-sm text-graphite">{c.application.itemName}</div>
                  </div>
                  {c.isDemo && <Badge tone="accent">Демо-договор — не имеет юридической силы</Badge>}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full bg-accent" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">Оплачено {formatPrice(paid)} из {formatPrice(total)} (без учёта взноса {formatPrice(c.downPayment)})</p>
                <table className="mt-4 w-full text-[15px]">
                  <thead><tr className="text-left text-sm text-muted"><th className="py-2 font-normal">№</th><th className="font-normal">Дата</th><th className="font-normal">Сумма</th><th className="text-right font-normal">Статус</th></tr></thead>
                  <tbody>
                    {c.schedule.map((s) => (
                      <tr key={s.id} className="border-t border-line">
                        <td className="py-2.5">{s.seq}</td>
                        <td>{formatDate(s.dueDate, locale)}</td>
                        <td>{formatPrice(s.amount)}</td>
                        <td className="text-right">{s.status === "PAID" ? <span className="text-success">Оплачен</span> : <span className="text-graphite">Ожидается</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        ) : (
          <p className="text-graphite">Действующих договоров нет.</p>
        )}
      </section>
    </div>
  );
}
