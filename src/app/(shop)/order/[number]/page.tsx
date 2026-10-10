import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getDict, pick } from "@/lib/i18n/server";
import { formatDateTime, formatPhone, formatPrice } from "@/lib/format";
import { getOrderForCustomer, ORDER_STATUS_LABELS } from "@/server/services/orders";
import { getCurrentUser } from "@/server/auth/session";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PayButton } from "@/components/cart/PayButton";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Заказ", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; new?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const sp = await searchParams;
  const { locale, t } = await getDict();
  const user = await getCurrentUser();
  let order;
  try {
    order = await getOrderForCustomer(number, { userId: user?.id, token: sp.t });
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const delivery = await db.deliveryOption.findUnique({ where: { code: order.deliveryCode } });
  const lastPayment = order.payments[0];
  return (
    <div className="container max-w-4xl pb-20 pt-8 md:pt-12">
      {sp.new && (
        <div className="mb-8 flex items-center gap-4 rounded-3xl bg-success/10 p-6 text-success">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success text-white"><Icon name="check" strokeWidth={2.4} /></span>
          <div>
            <div className="font-display text-xl font-semibold">{t.order.thanks}</div>
            <p className="text-sm">Менеджер свяжется с вами для подтверждения. Сохраните ссылку на эту страницу, чтобы отслеживать статус.</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">{t.order.title} {order.number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-muted">{formatDateTime(order.createdAt)}</p>

      {order.status === "AWAITING_PAYMENT" && (
        <div className="mt-6 rounded-3xl border border-accent/40 bg-accent/5 p-6">
          <p className="font-medium">{lastPayment?.status === "FAILED" ? `Оплата не прошла${lastPayment.failureReason ? `: ${lastPayment.failureReason}` : ""}. Попробуйте ещё раз.` : lastPayment?.status === "PENDING" ? t.order.paymentPending : "Заказ ожидает оплаты."}</p>
          <div className="mt-4"><PayButton number={order.number} token={sp.t} label={`${t.order.pay} ${formatPrice(order.total)}`} /></div>
          {lastPayment?.isTest && <p className="mt-3 text-xs text-muted">{t.checkout.testPayments}</p>}
        </div>
      )}
      {order.payments.some((p) => p.status === "SUCCEEDED") && (
        <p className="mt-6 flex items-center gap-2 text-success"><Icon name="check" /> {t.order.paid}{order.payments.find((p) => p.status === "SUCCEEDED")?.isTest ? " (тестовый платёж)" : ""}</p>
      )}

      <section className="mt-10">
        <h2 className="font-sans text-lg font-semibold">{t.order.items}</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-4 py-4 text-[15px]">
              <span>
                <Link href={it.usedUnit ? `/used/${it.usedUnit.code}` : `/product/${it.product.slug}`} className="font-medium hover:text-primary">{it.name}</Link>
                <span className="block text-sm text-muted">{it.sku} · {it.quantity} {t.common.pcs} × {formatPrice(it.unitPrice)}</span>
              </span>
              <span className="font-medium">{formatPrice(it.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto mt-4 max-w-xs space-y-2 text-[15px]">
          <div className="flex justify-between"><dt className="text-graphite">{t.cart.subtotal}</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-success"><dt>{t.cart.discount}{order.promoCode ? ` (${order.promoCode.code})` : ""}</dt><dd>−{formatPrice(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-graphite">{t.cart.delivery}</dt><dd>{order.deliveryCost ? formatPrice(order.deliveryCost) : t.cart.free}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold"><dt>{t.cart.total}</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-surface p-5 text-[15px]">
          <h3 className="mb-2 font-sans font-semibold">{t.checkout.contacts}</h3>
          <p>{order.customerName}</p>
          <p className="text-graphite">{formatPhone(order.phone)}{order.email ? ` · ${order.email}` : ""}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 text-[15px]">
          <h3 className="mb-2 font-sans font-semibold">{t.cart.delivery}</h3>
          <p>{delivery ? pick(locale, delivery.nameRu, delivery.nameKk) : order.deliveryCode}</p>
          <p className="text-graphite">{order.city}{order.address ? `, ${order.address}` : ""}</p>
          {order.shipment?.trackingNumber && <p className="mt-1 text-sm">Трек-номер: {order.shipment.trackingNumber}</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-sans text-lg font-semibold">{t.order.history}</h2>
        <ol className="mt-4 space-y-3 border-l border-line pl-5">
          {order.history.map((h) => (
            <li key={h.id} className="relative text-[15px]">
              <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="font-medium">{ORDER_STATUS_LABELS[h.toStatus]}</span>
              <span className="ml-2 text-sm text-muted">{formatDateTime(h.createdAt)}</span>
              {h.comment && <span className="block text-sm text-graphite">{h.comment}</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
