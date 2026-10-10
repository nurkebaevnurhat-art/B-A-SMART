import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel, F, FCheck, FSelect } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { savePromo } from "../_actions/marketing";

type Promo = Awaited<ReturnType<typeof db.promoCode.findMany>>[number];

function PromoFields({ p }: { p?: Promo }) {
  const d = (x?: Date | null) => (x ? x.toISOString().slice(0, 10) : undefined);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <F label="Код" name="code" defaultValue={p?.code} required />
      <FSelect label="Тип" name="type" defaultValue={p?.type} options={[{ value: "PERCENT", label: "Процент" }, { value: "FIXED", label: "Сумма, ₸" }]} />
      <F label="Значение" name="value" type="number" defaultValue={p?.value} required />
      <F label="Мин. сумма заказа, ₸" name="minOrderTotal" type="number" defaultValue={p?.minOrderTotal ?? 0} />
      <F label="Лимит использований" name="maxUses" type="number" defaultValue={p?.maxUses} />
      <F label="Начало" name="startsAt" type="date" defaultValue={d(p?.startsAt)} />
      <F label="Окончание" name="endsAt" type="date" defaultValue={d(p?.endsAt)} />
      <div className="flex items-end pb-2"><FCheck label="Активен" name="isActive" defaultChecked={p ? p.isActive : true} /></div>
    </div>
  );
}

export default async function PromoPage() {
  await pageStaff("promo.write", "/admin/promo");
  const promos = await db.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Промокоды" description="Скидка проверяется и применяется сервером при оформлении заказа" />
      <Panel title="Новый промокод" className="mb-6">
        <ActionForm action={savePromo} submitLabel="Создать" resetOnSuccess><PromoFields /></ActionForm>
      </Panel>
      <div className="space-y-4">
        {promos.map((p) => (
          <Panel key={p.id} title={`${p.code} — ${p.type === "PERCENT" ? `${p.value}%` : formatPrice(p.value)}`} actions={<span className="text-sm text-muted">использован {p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ""}{p.endsAt ? ` · до ${formatDate(p.endsAt)}` : ""}</span>}>
            <ActionForm action={savePromo} submitLabel="Сохранить" submitVariant="outline">
              <input type="hidden" name="id" value={p.id} />
              <PromoFields p={p} />
            </ActionForm>
          </Panel>
        ))}
      </div>
    </>
  );
}
