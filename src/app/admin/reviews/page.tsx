import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { moderateReview } from "../_actions/marketing";

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await pageStaff("reviews.moderate", "/admin/reviews");
  const sp = await searchParams;
  const status = (sp.status ?? "PENDING") as "PENDING" | "APPROVED" | "REJECTED";
  const reviews = await db.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { name: true, slug: true } } } });
  return (
    <>
      <PageHeader title="Отзывы" description="Публикуются только реальные отзывы зарегистрированных покупателей после модерации" />
      <div className="mb-5 flex gap-2 text-sm">
        {[["PENDING", "На модерации"], ["APPROVED", "Опубликованные"], ["REJECTED", "Отклонённые"]].map(([k, l]) => (
          <Link key={k} href={`?status=${k}`} className={`rounded-full px-3 py-1.5 ${status === k ? "bg-ink text-white" : "bg-white"}`}>{l}</Link>
        ))}
      </div>
      <div className="space-y-4">
        {reviews.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span><b>{r.authorName}</b> · <span className="text-accent">{"★".repeat(r.rating)}</span> · {r.product ? <Link href={`/product/${r.product.slug}`} className="text-primary" target="_blank">{r.product.name}</Link> : "—"}</span>
              <span className="flex items-center gap-2">{r.isVerifiedPurchase && <Badge tone="success">покупка подтверждена</Badge>}<span className="text-muted">{formatDateTime(r.createdAt)}</span></span>
            </div>
            <p className="mt-3 text-sm text-graphite">{r.text}</p>
            <div className="mt-3 flex gap-2">
              {status !== "APPROVED" && <ActionForm action={moderateReview} submitLabel="Опубликовать" inline submitVariant="accent"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="APPROVED" /></ActionForm>}
              {status !== "REJECTED" && <ActionForm action={moderateReview} submitLabel="Отклонить" inline submitVariant="outline"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="REJECTED" /></ActionForm>}
            </div>
          </Panel>
        ))}
        {!reviews.length && <p className="text-muted">Нет отзывов.</p>}
      </div>
    </>
  );
}
