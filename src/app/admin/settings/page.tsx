import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { getSetting } from "@/server/services/settings";
import { PageHeader, Panel, F, FArea, FCheck } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveCheckoutSettings, saveDelivery, saveGrades, saveInstallmentSettings, saveStoreSettings, saveTopbar } from "../_actions/system";

export default async function Settings() {
  const user = await pageStaff("settings.write", "/admin/settings");
  const [store, topbar, grades, inst, checkout, delivery, outbox] = await Promise.all([
    getSetting("store"), getSetting("topbar"), getSetting("grades"), getSetting("installment"), getSetting("checkout"),
    db.deliveryOption.findMany({ orderBy: { sortOrder: "asc" } }),
    db.outboxMessage.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const topItems = [...topbar.items, { ru: "", kk: "", href: "" }, { ru: "", kk: "", href: "" }].slice(0, Math.max(3, topbar.items.length + 1));
  return (
    <>
      <PageHeader title="Настройки магазина" description="Все изменения сохраняются в базе данных и сразу применяются на сайте и в API" />
      <div className="grid gap-6 2xl:grid-cols-2">
        <Panel title="Магазин и контакты">
          <ActionForm action={saveStoreSettings}>
            <div className="grid gap-3 md:grid-cols-2">
              <F label="Название" name="name" defaultValue={store.name} required />
              <F label="Город магазина" name="city" defaultValue={store.city} required />
              <F label="Телефон" name="phone" defaultValue={store.phone} />
              <F label="WhatsApp" name="whatsapp" defaultValue={store.whatsapp} />
              <F label="Email" name="email" defaultValue={store.email} />
              <F label="Режим работы" name="workHours" defaultValue={store.workHours} />
              <F label="Адрес" name="address" defaultValue={store.address} className="md:col-span-2" />
              <F label="Instagram (URL)" name="instagram" defaultValue={store.instagram} />
              <F label="Юр. лицо / ИП" name="legalName" defaultValue={store.legalName} />
              <F label="БИН / ИИН" name="bin" defaultValue={store.bin} />
              <FArea label="Города доставки (по одному в строке)" name="cities" defaultValue={store.cities.join("\n")} rows={5} />
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Информационная полоса над шапкой">
          <p className="mb-3 text-xs text-muted">Только реальные условия. Условия бесплатной доставки добавляются автоматически из способов доставки.</p>
          <ActionForm action={saveTopbar}>
            <div className="space-y-3">
              {topItems.map((it, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-3">
                  <input name="ru[]" defaultValue={it.ru} placeholder="Текст (рус.)" className="h-10 rounded-lg border border-line px-3 text-sm" />
                  <input name="kk[]" defaultValue={it.kk} placeholder="Мәтін (қаз.)" className="h-10 rounded-lg border border-line px-3 text-sm" />
                  <input name="href[]" defaultValue={it.href} placeholder="/ссылка (необяз.)" className="h-10 rounded-lg border border-line px-3 text-sm" />
                </div>
              ))}
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Халяльная рассрочка" className="scroll-mt-6" >
          <div id="installment" />
          <ActionForm action={saveInstallmentSettings}>
            <div className="grid gap-3 md:grid-cols-2">
              <F label="Сроки, мес. (через запятую)" name="terms" defaultValue={inst.terms.join(", ")} />
              <F label="Мин. взнос, %" name="minDownPercent" type="number" defaultValue={inst.minDownPercent} />
              <F label="Мин. цена товара, ₸" name="minPrice" type="number" defaultValue={inst.minPrice} />
              <F label="Макс. цена товара, ₸" name="maxPrice" type="number" defaultValue={inst.maxPrice} />
              <F label="Фикс. наценка по срокам, %" name="markups" defaultValue={Object.entries(inst.markupPercentByTerm).map(([k, v]) => `${k}:${v}`).join(", ")} hint="Формат 3:0, 6:0, 12:0. Согласовывается до сделки, не растёт со временем" className="md:col-span-2" />
              <div className="space-y-2 md:col-span-2">
                <FCheck label="Программа включена" name="enabled" defaultChecked={inst.enabled} />
                <FCheck label="Демонстрационный режим (пометка на сайте)" name="isDemo" defaultChecked={inst.isDemo} />
                <FCheck label="Разрешить заключение договоров — только после проверки специалистом по исламским финансам и юристом (только владелец)" name="contractsEnabled" defaultChecked={inst.contractsEnabled} />
                {user.role.key !== "owner" && <p className="text-xs text-muted">Включить договоры может только владелец.</p>}
              </div>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Оформление заказа">
          <ActionForm action={saveCheckoutSettings}>
            <div className="space-y-3">
              <F label="Бронь б/у при оформлении, минут" name="reservationMinutes" type="number" defaultValue={checkout.reservationMinutes} />
              <FCheck label="Оплата при получении" name="cashOnDeliveryEnabled" defaultChecked={checkout.cashOnDeliveryEnabled} />
              <FCheck label="Онлайн-оплата" name="onlinePaymentEnabled" defaultChecked={checkout.onlinePaymentEnabled} />
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Критерии состояния б/у">
          <ActionForm action={saveGrades}>
            <div className="grid gap-3 md:grid-cols-2">
              {(["EXCELLENT", "GOOD", "FAIR"] as const).map((g) => (
                <div key={g} className="contents">
                  <FArea label={`${{ EXCELLENT: "Отличное", GOOD: "Хорошее", FAIR: "Удовлетворительное" }[g]} (рус.)`} name={`${g}_ru`} defaultValue={grades[g].ru} />
                  <FArea label="(каз.)" name={`${g}_kk`} defaultValue={grades[g].kk} />
                </div>
              ))}
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Способы доставки">
          <div className="space-y-4">
            {[...delivery, null].map((d, i) => (
              <details key={d?.id ?? "new"} open={!d} className="rounded-xl border border-line p-3">
                <summary className="cursor-pointer text-sm font-medium">{d ? `${d.nameRu}${d.isActive ? "" : " (выкл.)"}` : "+ Новый способ"}</summary>
                <ActionForm action={saveDelivery} resetOnSuccess={!d} className="mt-3">
                  {d && <input type="hidden" name="id" value={d.id} />}
                  <div className="grid gap-2 md:grid-cols-3">
                    <F label="Код" name="code" defaultValue={d?.code} required />
                    <F label="Название (рус.)" name="nameRu" defaultValue={d?.nameRu} required />
                    <F label="Название (каз.)" name="nameKk" defaultValue={d?.nameKk} required />
                    <F label="Стоимость, ₸" name="price" type="number" defaultValue={d?.price ?? 0} />
                    <F label="Бесплатно от, ₸" name="freeFrom" type="number" defaultValue={d?.freeFrom} />
                    <F label="Порядок" name="sortOrder" type="number" defaultValue={d?.sortOrder ?? i} />
                    <F label="Описание" name="description" defaultValue={d?.description} className="md:col-span-3" />
                    <FCheck label="Нужен адрес" name="needsAddress" defaultChecked={d ? d.needsAddress : true} />
                    <FCheck label="Активен" name="isActive" defaultChecked={d ? d.isActive : true} />
                  </div>
                </ActionForm>
              </details>
            ))}
          </div>
        </Panel>

        <Panel title="Очередь уведомлений (email / SMS)">
          <p className="mb-3 text-xs text-muted">Пока почтовый/SMS-сервис не подключён, сообщения (например, восстановление пароля) остаются здесь со статусом PENDING.</p>
          <ul className="divide-y divide-line text-sm">
            {outbox.map((m) => (
              <li key={m.id} className="py-2">
                <span className="text-muted">{formatDateTime(m.createdAt)} · {m.channel} → {m.to} · {m.status}</span>
                <div className="truncate">{m.subject ?? m.body}</div>
              </li>
            ))}
            {!outbox.length && <li className="py-2 text-muted">Пусто</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
