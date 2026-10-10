import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel, SearchBar, Table, Td } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { adjustStock } from "../_actions/products";

const REASON: Record<string, string> = { receipt: "Поступление", order: "Заказ", cancel: "Отмена заказа", adjustment: "Корректировка", writeoff: "Списание" };

export default async function Inventory({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  await pageStaff("inventory.write", "/admin/inventory");
  const sp = await searchParams;
  const where: Prisma.ProductVariantWhereInput = {
    product: { condition: { not: "USED" }, status: { not: "ARCHIVED" } },
    ...(sp.low ? { stock: { lte: 1 } } : {}),
    ...(sp.q ? { OR: [{ sku: { contains: sp.q, mode: "insensitive" } }, { product: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}),
  };
  const [variants, movements] = await Promise.all([
    db.productVariant.findMany({ where, include: { product: { select: { id: true, name: true } } }, orderBy: [{ stock: "asc" }, { sku: "asc" }], take: 300 }),
    db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { variant: { select: { sku: true, product: { select: { name: true } } } } } }),
  ]);
  const totalValue = variants.reduce((s, v) => s + v.stock * v.price, 0);
  return (
    <>
      <PageHeader title="Складские остатки" description={`Позиций: ${variants.length} · стоимость остатков по ценам продажи: ${formatPrice(totalValue)}`} />
      <SearchBar placeholder="SKU или название" defaultValue={sp.q}>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="low" value="1" defaultChecked={!!sp.low} /> Только остаток ≤ 1</label>
      </SearchBar>
      <Table head={["SKU", "Товар", "Вариант", "Цена", "Остаток", "Изменить"]} empty={!variants.length}>
        {variants.map((v) => (
          <tr key={v.id}>
            <Td className="font-mono text-xs">{v.sku}</Td>
            <Td><Link href={`/admin/products/${v.product.id}`} className="text-primary">{v.product.name}</Link></Td>
            <Td>{[v.color, v.storageGb && `${v.storageGb} ГБ`].filter(Boolean).join(", ")}{!v.isActive && <span className="ml-1 text-xs text-muted">(неактивен)</span>}</Td>
            <Td>{formatPrice(v.price)}</Td>
            <Td className={`font-semibold ${v.stock === 0 ? "text-danger" : ""}`}>{v.stock}</Td>
            <Td>
              <ActionForm action={adjustStock} submitLabel="OK" inline resetOnSuccess submitVariant="outline">
                <input type="hidden" name="variantId" value={v.id} />
                <input type="hidden" name="reason" value="adjustment" />
                <input name="delta" type="number" placeholder="±" required className="h-9 w-20 rounded-lg border border-line px-2 text-sm" aria-label="Изменение остатка" />
              </ActionForm>
            </Td>
          </tr>
        ))}
      </Table>
      <Panel title="Последние движения" className="mt-6">
        <ul className="divide-y divide-line text-sm">
          {movements.map((m) => (
            <li key={m.id} className="flex flex-wrap gap-x-4 py-2">
              <span className="text-muted">{formatDateTime(m.createdAt)}</span>
              <span className={m.delta > 0 ? "text-success" : "text-danger"}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
              <span>{m.variant.product.name} ({m.variant.sku})</span>
              <span className="text-muted">{REASON[m.reason] ?? m.reason}{m.comment ? ` — ${m.comment}` : ""}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
