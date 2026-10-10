import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPhone, formatPrice } from "@/lib/format";
import { getSetting } from "@/server/services/settings";
import { DEFAULT_CHECKS } from "@/server/services/products";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const dynamic = "force-dynamic";

const TITLES: Record<string, { title: string; description: string }> = {
  delivery: { title: "Доставка и гарантия", description: "Способы и стоимость доставки, самовывоз, гарантия на новые и б/у устройства." },
  "used-check": { title: "Как мы проверяем б/у устройства", description: "Порядок проверки б/у смартфонов и критерии оценки состояния." },
  returns: { title: "Обмен и возврат", description: "Порядок обмена и возврата товара." },
  terms: { title: "Условия покупки", description: "Условия покупки в интернет-магазине." },
  privacy: { title: "Политика конфиденциальности", description: "Как мы обрабатываем персональные данные." },
  contacts: { title: "Контакты", description: "Адрес, телефон и режим работы магазина." },
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = TITLES[(await params).slug];
  return m ? { title: m.title, description: m.description, alternates: { canonical: `/info/${(await params).slug}` } } : {};
}

const LegalNote = () => (
  <p className="rounded-2xl border border-accent/40 bg-accent/5 p-4 text-sm">
    Шаблон документа. Перед запуском продаж текст должен проверить юрист с учётом законодательства Республики Казахстан и реквизитов продавца.
  </p>
);

export default async function InfoPage({ params }: Props) {
  const { slug } = await params;
  const meta = TITLES[slug];
  if (!meta) notFound();
  const store = await getSetting("store");
  const seller = store.legalName ? `${store.legalName}${store.bin ? `, БИН ${store.bin}` : ""}` : "Продавец (реквизиты указываются в настройках магазина)";
  let body: React.ReactNode = null;

  if (slug === "delivery") {
    const [opts, checkout] = await Promise.all([db.deliveryOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), getSetting("checkout")]);
    body = (
      <>
        <h2>Способы доставки</h2>
        <ul>
          {opts.map((o) => (
            <li key={o.id}>
              <b>{o.nameRu}</b> — {o.price === 0 ? "бесплатно" : formatPrice(o.price)}
              {o.freeFrom !== null && o.price > 0 ? `, бесплатно при заказе от ${formatPrice(o.freeFrom)}` : ""}. {o.description}
            </li>
          ))}
        </ul>
        <p>Итоговая стоимость доставки рассчитывается сервером при оформлении заказа и показывается до подтверждения.</p>
        <h2>Оплата</h2>
        <ul>
          {checkout.cashOnDeliveryEnabled && <li>Оплата при получении.</li>}
          {checkout.onlinePaymentEnabled && <li>Онлайн-оплата через платёжный сервис. Заказ считается оплаченным только после подтверждения от платёжного сервиса.</li>}
        </ul>
        <h2>Гарантия</h2>
        <p>Условия гарантии указываются на странице каждого товара. Для новых устройств действует гарантия производителя согласно гарантийному талону. Для б/у экземпляров условия гарантии магазина указываются в карточке конкретного экземпляра.</p>
      </>
    );
  } else if (slug === "used-check") {
    const grades = await getSetting("grades");
    body = (
      <>
        <p>Каждый б/у смартфон продаётся как отдельный экземпляр с уникальным номером. В его карточке указаны фото именно этого устройства, состояние корпуса и экрана, ёмкость аккумулятора (если измерялась), известные дефекты, сведения о ремонтах и результаты проверки.</p>
        <h2>Что проверяется</h2>
        <ul>{DEFAULT_CHECKS.map((c) => <li key={c.key}>{c.label}</li>)}</ul>
        <p>Если какой-либо пункт не проверялся, в отчёте это указано явно («Не проверялось»). Мы не заявляем об оригинальности деталей без подтверждающих данных.</p>
        <h2>Категории состояния</h2>
        <ul>
          <li><b>Отличное.</b> {grades.EXCELLENT.ru}</li>
          <li><b>Хорошее.</b> {grades.GOOD.ru}</li>
          <li><b>Удовлетворительное.</b> {grades.FAIR.ru}</li>
        </ul>
        <h2>Бронирование</h2>
        <p>При переходе к оформлению заказа экземпляр бронируется за покупателем на ограниченное время, чтобы его не купил кто-то другой.</p>
        <p><Link href="/used" className="link">Смотреть б/у смартфоны</Link></p>
      </>
    );
  } else if (slug === "returns") {
    body = (
      <>
        <LegalNote />
        <p>Обмен и возврат товара осуществляются в соответствии с Законом Республики Казахстан «О защите прав потребителей».</p>
        <h2>Товар надлежащего качества</h2>
        <p>Порядок и сроки обмена/возврата товара надлежащего качества, а также перечень товаров, не подлежащих обмену, определяются законодательством. Уточните условия у менеджера до покупки.</p>
        <h2>Товар с недостатками</h2>
        <p>При обнаружении недостатка, не указанного в карточке товара или экземпляра, обратитесь в магазин с документом о покупке. Для б/у экземпляров известные дефекты, перечисленные в карточке, не являются основанием для возврата.</p>
        <h2>Как обратиться</h2>
        <p>Через раздел «Поддержка» в личном кабинете или по телефону магазина.</p>
      </>
    );
  } else if (slug === "terms") {
    body = (
      <>
        <LegalNote />
        <p>Продавец: {seller}.</p>
        <h2>1. Оформление заказа</h2>
        <p>Цены указаны в тенге. Стоимость заказа, наличие товара и применимость скидок проверяются сервером в момент оформления. Заказ считается принятым после подтверждения менеджером.</p>
        <h2>2. Оплата</h2>
        <p>Доступные способы оплаты показываются при оформлении. При онлайн-оплате данные банковской карты вводятся только на странице платёжного сервиса; магазин их не получает и не хранит.</p>
        <h2>3. Б/у товары</h2>
        <p>Б/у устройства продаются в состоянии, описанном в карточке конкретного экземпляра, включая указанные дефекты.</p>
        <h2>4. Рассрочка</h2>
        <p>Рассрочка оформляется отдельным договором. Условия программы указаны на странице «Халяльная рассрочка».</p>
      </>
    );
  } else if (slug === "privacy") {
    body = (
      <>
        <LegalNote />
        <p>Оператор персональных данных: {seller}. Обработка ведётся в соответствии с Законом Республики Казахстан «О персональных данных и их защите».</p>
        <h2>Какие данные мы собираем</h2>
        <ul>
          <li>Имя, телефон, email, город и адрес — для оформления и доставки заказа.</li>
          <li>Данные заявки на рассрочку (ФИО, телефон, город) — для её рассмотрения.</li>
          <li>Технические данные сессии (cookie) — для работы корзины и входа в аккаунт.</li>
        </ul>
        <h2>Что мы не собираем</h2>
        <p>Мы не храним данные банковских карт, CVV и PIN-коды. Мы не просим загружать на сайт документы, удостоверяющие личность.</p>
        <h2>Хранение и защита</h2>
        <p>Пароли хранятся только в виде криптографического хеша. Доступ сотрудников к данным ограничен ролями; действия администраторов записываются в журнал.</p>
        <h2>Ваши права</h2>
        <p>Вы можете запросить уточнение или удаление своих данных через раздел «Поддержка» или по контактам магазина.</p>
      </>
    );
  } else if (slug === "contacts") {
    body = (
      <dl className="grid gap-4 md:grid-cols-2">
        {store.phone && <div><dt className="text-sm text-muted">Телефон</dt><dd className="text-lg font-medium"><a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}>{formatPhone(store.phone)}</a></dd></div>}
        {store.email && <div><dt className="text-sm text-muted">Email</dt><dd className="text-lg font-medium">{store.email}</dd></div>}
        {store.address && <div><dt className="text-sm text-muted">Адрес</dt><dd className="text-lg font-medium">{store.city}, {store.address}</dd></div>}
        {store.workHours && <div><dt className="text-sm text-muted">Режим работы</dt><dd className="text-lg font-medium">{store.workHours}</dd></div>}
        {store.legalName && <div><dt className="text-sm text-muted">Юридическое лицо</dt><dd>{seller}</dd></div>}
      </dl>
    );
  }

  return (
    <div className="container max-w-3xl pb-20 pt-8 md:pt-12">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: meta.title }]} />
      <h1 className="mb-8 mt-4 font-display text-3xl font-semibold md:text-[42px]">{meta.title}</h1>
      <div className="prose-shop space-y-4">{body}</div>
    </div>
  );
}
