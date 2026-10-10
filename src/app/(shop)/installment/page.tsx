import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { formatPrice, storageLabel } from "@/lib/format";
import { getSetting } from "@/server/services/settings";
import { getCurrentUser } from "@/server/auth/session";
import { getShell } from "@/server/layout-data";
import { InstallmentClient, type InstallmentItem } from "@/components/installment/InstallmentClient";
import { Faq } from "@/components/home/Faq";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Халяльная рассрочка на смартфоны",
  description: "Рассрочка без процентов, скрытых комиссий и штрафов: цена фиксируется заранее. Калькулятор платежей и заявка онлайн.",
  alternates: { canonical: "/installment" },
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ product?: string; variant?: string; unit?: string }> };

export default async function InstallmentPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { locale, t } = await getDict();
  const [s, user, shell] = await Promise.all([getSetting("installment"), getCurrentUser(), getShell(locale)]);

  const [products, units] = await Promise.all([
    db.product.findMany({
      where: { status: "PUBLISHED", installmentAvailable: true, condition: { not: "USED" } },
      include: { variants: { where: { isActive: true, stock: { gt: 0 }, price: { gte: s.minPrice, lte: s.maxPrice } }, orderBy: { price: "asc" } }, category: true },
      orderBy: [{ salesCount: "desc" }],
    }),
    db.usedUnit.findMany({
      where: { status: "AVAILABLE", price: { gte: s.minPrice, lte: s.maxPrice }, product: { status: "PUBLISHED", installmentAvailable: true } },
      include: { product: true },
      orderBy: { price: "asc" },
    }),
  ]);
  const items: InstallmentItem[] = [
    ...products.flatMap((p) =>
      p.variants.map((v) => ({
        key: `v:${v.id}`,
        productId: p.id,
        variantId: v.id,
        label: [p.name, v.color, storageLabel(v.storageGb)].filter(Boolean).join(", "),
        price: v.price,
        group: p.condition === "REFURBISHED" ? "Восстановленные" : p.category.nameRu,
      })),
    ),
    ...units.map((u) => ({ key: `u:${u.code}`, productId: u.productId, usedUnitId: u.id, label: `${u.product.name}, ${storageLabel(u.storageGb) ?? ""} (б/у, № ${u.code})`, price: u.price, group: "Б/у смартфоны" })),
  ];
  let initialKey: string | undefined;
  if (sp.unit) initialKey = `u:${sp.unit}`;
  else if (sp.variant) initialKey = `v:${sp.variant}`;
  else if (sp.product) {
    const p = products.find((x) => x.slug === sp.product);
    if (p?.variants[0]) initialKey = `v:${p.variants[0].id}`;
  }

  const steps = [
    ["Выберите товар", "Смартфон, планшет или б/у устройство с отметкой «Доступна рассрочка»."],
    ["Рассчитайте платёж", "Укажите первоначальный взнос и срок — калькулятор покажет полную цену и график."],
    ["Оставьте заявку", "Имя, телефон и город. Документы на сайт загружать не нужно."],
    ["Подпишите договор", "Менеджер согласует условия. Цена и график фиксируются в договоре и не меняются."],
  ];

  return (
    <div className="pb-16">
      <section className="bg-primary-dark text-white">
        <div className="container py-14 md:py-20">
          <div className="eyebrow">{t.nav.installment}</div>
          <h1 className="mt-3 max-w-3xl font-display text-[34px] font-semibold leading-tight md:text-[52px]">Цена известна заранее. Без процентов и штрафов.</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Мы продаём товар по полной согласованной цене, которая фиксируется до сделки. Вы платите её частями по графику — без процентов на остаток, скрытых комиссий и штрафов за просрочку.
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[15px] text-white/85">
            <li className="flex items-center gap-2"><Icon name="check" className="text-accent" /> Сроки: {s.terms.join(", ")} мес.</li>
            <li className="flex items-center gap-2"><Icon name="check" className="text-accent" /> Взнос от {s.minDownPercent}%</li>
            <li className="flex items-center gap-2"><Icon name="check" className="text-accent" /> Товары от {formatPrice(s.minPrice)} до {formatPrice(s.maxPrice)}</li>
          </ul>
        </div>
      </section>

      <div className="container mt-12 md:mt-16">
        {s.enabled ? (
          <InstallmentClient
            items={items}
            settings={{ terms: s.terms, minDownPercent: s.minDownPercent, markupPercentByTerm: s.markupPercentByTerm, minPrice: s.minPrice, maxPrice: s.maxPrice, isDemo: s.isDemo }}
            initialKey={initialKey}
            defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", city: user?.city ?? shell.city }}
            cities={shell.store.cities}
          />
        ) : (
          <p className="rounded-2xl bg-surface p-6 text-graphite">Приём заявок временно приостановлен.</p>
        )}
      </div>

      <section className="container section">
        <h2 className="section-title">Как это работает</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-4">
          {steps.map(([title, text], i) => (
            <li key={title}>
              <div className="font-display text-3xl font-semibold text-accent">0{i + 1}</div>
              <div className="mt-3 font-semibold">{title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-graphite">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container grid gap-10 lg:grid-cols-[1fr_2fr]">
        <h2 className="section-title">Условия программы</h2>
        <Faq
          items={[
            { q: "Принцип работы", a: "Магазин продаёт товар, который находится в его собственности, по цене, согласованной до заключения договора. Покупатель оплачивает её частями. Если в договоре предусмотрена наценка продавца, она фиксированная, указывается отдельной строкой и не растёт со временем. Сумма долга не увеличивается при досрочном погашении или задержке платежа." },
            { q: "Какие товары участвуют", a: "Товары с пометкой «Доступна рассрочка» в каталоге, в том числе отдельные б/у экземпляры, стоимостью в пределах лимитов программы." },
            { q: "Полная согласованная цена", a: "Это итоговая сумма, которую вы заплатите за товар: цена товара плюс фиксированная наценка (если она установлена для выбранного срока). Калькулятор показывает её до подачи заявки." },
            { q: "Первоначальный взнос и сроки", a: `Минимальный взнос — ${s.minDownPercent}% от полной цены. Доступные сроки: ${s.terms.join(", ")} мес. Остаток делится на равные ежемесячные платежи; округление учитывается в последнем платеже.` },
            { q: "Необходимые документы", a: "Для подачи заявки достаточно имени, телефона и города. Для заключения договора потребуется документ, удостоверяющий личность, — его проверяет менеджер при встрече. Мы не просим загружать документы на сайт." },
            { q: "Досрочное погашение и возврат", a: "Досрочное погашение не увеличивает и не уменьшает согласованную цену, кроме случаев, прямо предусмотренных договором. Порядок возврата товара определяется договором и законодательством Республики Казахстан о защите прав потребителей." },
            { q: "Почему это не кредит", a: "В программе нет процентной ставки, начисляемой на остаток, и нет штрафов. Конкретная модель сделки проходит проверку специалистом по исламским финансам и юристом в Казахстане; до её завершения калькулятор работает в демонстрационном режиме, а договоры не заключаются." },
          ]}
        />
      </section>
    </div>
  );
}
