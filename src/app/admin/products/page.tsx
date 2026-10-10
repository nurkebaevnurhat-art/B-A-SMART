import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, SearchBar, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

const STATUS = { DRAFT: ["Черновик", "muted"], PUBLISHED: ["Опубликован", "success"], ARCHIVED: ["Архив", "outline"] } as const;
const COND = { NEW: "Новый", USED: "Б/у (модель)", REFURBISHED: "Восст." };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }> }) {
  await pageStaff("products.read", "/admin/products");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { model: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } }] } : {}),
    ...(sp.status ? { status: sp.status as "DRAFT" } : {}),
    ...(sp.category ? { category: { slug: sp.category } } : {}),
  };
  const [rows, total, cats] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { brand: true, category: true, variants: true, _count: { select: { usedUnits: true, images: true } } } }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Товары" description={`Всего: ${total}`} actions={<ButtonLink href="/admin/products/new" size="sm">+ Новый товар</ButtonLink>} />
      <SearchBar placeholder="Название, модель или SKU" defaultValue={sp.q}>
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-lg border border-line px-3 text-sm">
          <option value="">Все статусы</option>
          <option value="PUBLISHED">Опубликованные</option>
          <option value="DRAFT">Черновики</option>
          <option value="ARCHIVED">Архив</option>
        </select>
        <select name="category" defaultValue={sp.category ?? ""} className="h-10 rounded-lg border border-line px-3 text-sm">
          <option value="">Все категории</option>
          {cats.map((c) => <option key={c.id} value={c.slug}>{c.nameRu}</option>)}
        </select>
      </SearchBar>
      <Table head={["Товар", "Категория", "Состояние", "Цена", "Остаток", "Фото", "Статус"]} empty={!rows.length}>
        {rows.map((p) => {
          const prices = p.variants.map((v) => v.price);
          const stock = p.variants.reduce((s, v) => s + v.stock, 0);
          return (
            <tr key={p.id} className="hover:bg-surface/60">
              <Td>
                <Link href={`/admin/products/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                <div className="text-xs text-muted">{p.brand.name} · {p.variants.length} вар.</div>
              </Td>
              <Td>{p.category.nameRu}</Td>
              <Td>{COND[p.condition]}{p.condition === "USED" ? ` · ${p._count.usedUnits} экз.` : ""}</Td>
              <Td>{prices.length ? `${formatPrice(Math.min(...prices))}${prices.length > 1 ? "+" : ""}` : "—"}</Td>
              <Td className={stock === 0 && p.condition !== "USED" ? "text-danger" : ""}>{p.condition === "USED" ? "—" : stock}</Td>
              <Td>{p._count.images || <span className="text-accent-dark">нет</span>}</Td>
              <Td><Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge></Td>
            </tr>
          );
        })}
      </Table>
      {total > 50 && (
        <div className="mt-4 flex gap-2 text-sm">
          {page > 1 && <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`} className="rounded-lg border border-line px-3 py-1.5">←</Link>}
          <span className="px-2 py-1.5">Стр. {page}</span>
          {page * 50 < total && <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`} className="rounded-lg border border-line px-3 py-1.5">→</Link>}
        </div>
      )}
    </>
  );
}
