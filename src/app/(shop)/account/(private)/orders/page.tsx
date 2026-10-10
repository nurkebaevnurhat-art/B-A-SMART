import Link from "next/link";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { formatDate, formatPrice } from "@/lib/format";
import { pageUser } from "@/server/guards";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { ButtonLink } from "@/components/ui/Button";

export default async function MyOrdersPage() {
  const user = await pageUser("/account/orders");
  const { locale, t } = await getDict();
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { name: true, quantity: true } }, shipment: true },
  });
  if (!orders.length) {
    return (
      <div className="rounded-3xl bg-surface p-10 text-center">
        <p className="text-graphite">{t.account.noOrders}</p>
        <ButtonLink href="/catalog/smartphones" className="mt-6">{t.cart.toCatalog}</ButtonLink>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/order/${o.number}`} className="block rounded-2xl border border-line p-5 transition-colors hover:border-ink">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold">{o.number}</span>
              <OrderStatusBadge status={o.status} />
            </div>
            <p className="mt-2 text-sm text-graphite">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</p>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-muted">{formatDate(o.createdAt, locale)}{o.shipment?.trackingNumber ? ` · трек ${o.shipment.trackingNumber}` : ""}</span>
              <span className="font-semibold">{formatPrice(o.total)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
