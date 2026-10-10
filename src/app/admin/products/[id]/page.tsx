import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { hasPermission } from "@/server/auth/permissions";
import { parseSpecs } from "@/server/services/products";
import { specsToText } from "@/server/admin/specs";
import { PageHeader, Panel, F, FCheck } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { adjustStock, deleteImage, moveImage, saveVariant, setProductStatus, uploadProductImage } from "../../_actions/products";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageStaff("products.read", `/admin/products/${id}`);
  const [p, brands, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: [{ storageGb: "asc" }, { price: "asc" }] }, images: { orderBy: { sortOrder: "asc" } }, compatibleWith: true, usedUnits: { orderBy: { createdAt: "desc" } } },
    }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!p) notFound();
  const canWrite = hasPermission(user, "products.write");
  const canPublish = hasPermission(user, "products.publish");
  const canStock = hasPermission(user, "inventory.write");
  const statusLabel = { DRAFT: "Черновик", PUBLISHED: "Опубликован", ARCHIVED: "Архив" }[p.status];

  return (
    <>
      <PageHeader
        title={p.name}
        back={{ href: "/admin/products", label: "Товары" }}
        description={<span className="flex flex-wrap items-center gap-2"><Badge tone={p.status === "PUBLISHED" ? "success" : "muted"}>{statusLabel}</Badge> {p.status === "PUBLISHED" && <Link href={`/product/${p.slug}`} target="_blank" className="text-primary">Открыть на сайте ↗</Link>}</span>}
        actions={
          canPublish && (
            <>
              {p.status !== "PUBLISHED" && <ActionForm action={setProductStatus} submitLabel="Опубликовать" inline submitVariant="accent"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="PUBLISHED" /></ActionForm>}
              {p.status === "PUBLISHED" && <ActionForm action={setProductStatus} submitLabel="Снять с публикации" inline submitVariant="outline"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="DRAFT" /></ActionForm>}
              {p.status !== "ARCHIVED" && <ActionForm action={setProductStatus} submitLabel="В архив" inline submitVariant="ghost" confirm="Перенести товар в архив?"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="ARCHIVED" /></ActionForm>}
            </>
          )
        }
      />

      <div className="grid gap-6 2xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Основное">
          {canWrite ? (
            <ProductForm product={p} brands={brands} categories={categories} specsText={specsToText(parseSpecs(p.specs))} compat={p.compatibleWith.map((c) => c.modelKey).join(", ")} />
          ) : (
            <p className="text-sm text-muted">Только просмотр — нет права на редактирование.</p>
          )}
        </Panel>

        <div className="space-y-6">
          {p.condition !== "USED" ? (
            <Panel title={`Варианты (${p.variants.length})`}>
              <div className="space-y-4">
                {p.variants.map((v) => (
                  <div key={v.id} className="rounded-xl border border-line p-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="font-medium">{[v.color, v.storageGb && `${v.storageGb} ГБ`].filter(Boolean).join(", ") || v.sku}</span>
                      <span className={v.stock === 0 ? "text-danger" : "text-success"}>Остаток: {v.stock}</span>
                    </div>
                    {canWrite && (
                      <ActionForm action={saveVariant} submitLabel="Сохранить вариант" submitVariant="outline">
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="productId" value={p.id} />
                        <VariantFields v={v} />
                      </ActionForm>
                    )}
                    {canStock && (
                      <ActionForm action={adjustStock} submitLabel="Изменить остаток" submitVariant="ghost" resetOnSuccess className="mt-3 border-t border-line pt-3">
                        <input type="hidden" name="variantId" value={v.id} />
                        <div className="grid grid-cols-[100px_1fr_1fr] gap-2">
                          <F label="± шт." name="delta" type="number" required />
                          <label className="block"><span className="mb-1 block text-xs font-medium text-graphite">Причина</span>
                            <select name="reason" className="h-10 w-full rounded-lg border border-line px-2 text-sm"><option value="receipt">Поступление</option><option value="adjustment">Корректировка</option><option value="writeoff">Списание</option></select>
                          </label>
                          <F label="Комментарий" name="comment" />
                        </div>
                      </ActionForm>
                    )}
                  </div>
                ))}
              </div>
              {canWrite && (
                <details className="mt-4 rounded-xl bg-surface p-4">
                  <summary className="cursor-pointer text-sm font-medium">+ Добавить вариант</summary>
                  <ActionForm action={saveVariant} submitLabel="Добавить" resetOnSuccess className="mt-4">
                    <input type="hidden" name="productId" value={p.id} />
                    <VariantFields />
                    <div className="mt-3 max-w-[200px]"><F label="Начальный остаток" name="initialStock" type="number" min={0} /></div>
                  </ActionForm>
                </details>
              )}
            </Panel>
          ) : (
            <Panel title={`Б/у экземпляры (${p.usedUnits.length})`} actions={<Link href={`/admin/used/new?product=${p.id}`} className="text-sm text-primary">+ Экземпляр</Link>}>
              <ul className="divide-y divide-line text-sm">
                {p.usedUnits.map((u) => (
                  <li key={u.id} className="flex justify-between py-2">
                    <Link href={`/admin/used/${u.id}`} className="text-primary">{u.code} · {u.storageGb} ГБ · {u.color}</Link>
                    <span>{formatPrice(u.price)} · {u.status}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title={`Фотографии (${p.images.length})`}>
            <div className="grid grid-cols-3 gap-3">
              {p.images.map((im) => (
                <div key={im.id} className="rounded-xl border border-line p-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
                    <Image src={im.url} alt={im.alt ?? ""} fill sizes="160px" className="object-contain" unoptimized />
                  </div>
                  {im.variantId && <div className="mt-1 truncate text-[11px] text-muted">{p.variants.find((v) => v.id === im.variantId)?.color}</div>}
                  {canWrite && (
                    <div className="mt-1 flex justify-between">
                      <ActionForm action={moveImage} submitLabel="←" inline submitVariant="ghost"><input type="hidden" name="id" value={im.id} /><input type="hidden" name="dir" value="up" /></ActionForm>
                      <ActionForm action={deleteImage} submitLabel="✕" inline submitVariant="ghost" confirm="Удалить фото?"><input type="hidden" name="id" value={im.id} /></ActionForm>
                      <ActionForm action={moveImage} submitLabel="→" inline submitVariant="ghost"><input type="hidden" name="id" value={im.id} /><input type="hidden" name="dir" value="down" /></ActionForm>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {!p.images.length && <p className="text-sm text-accent-dark">Фото нет — на сайте показывается иллюстрация с пометкой. Загрузите реальные фотографии этой модели.</p>}
            {canWrite && (
              <ActionForm action={uploadProductImage} submitLabel="Загрузить" resetOnSuccess className="mt-4 border-t border-line pt-4">
                <input type="hidden" name="productId" value={p.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-xs font-medium text-graphite">Файл (JPEG/PNG/WebP, до 5 МБ)
                    <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block w-full text-sm" />
                  </label>
                  <F label="…или URL изображения" name="url" placeholder="https://" />
                  <F label="Alt-текст" name="alt" defaultValue={p.name} />
                  <label className="block"><span className="mb-1 block text-xs font-medium text-graphite">Для цвета</span>
                    <select name="variantId" className="h-10 w-full rounded-lg border border-line px-2 text-sm">
                      <option value="">Общее фото</option>
                      {p.variants.filter((v, i, a) => v.color && a.findIndex((x) => x.color === v.color) === i).map((v) => <option key={v.id} value={v.id}>{v.color}</option>)}
                    </select>
                  </label>
                </div>
              </ActionForm>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function VariantFields({ v }: { v?: { sku: string; color: string | null; colorHex: string | null; storageGb: number | null; ramGb: number | null; price: number; oldPrice: number | null; isActive: boolean } }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <F label="SKU" name="sku" defaultValue={v?.sku} required />
      <F label="Цвет" name="color" defaultValue={v?.color} />
      <F label="HEX цвета" name="colorHex" defaultValue={v?.colorHex} placeholder="#000000" />
      <F label="Память, ГБ" name="storageGb" type="number" defaultValue={v?.storageGb} />
      <F label="ОЗУ, ГБ" name="ramGb" type="number" defaultValue={v?.ramGb} />
      <F label="Цена, ₸" name="price" type="number" defaultValue={v?.price} required />
      <F label="Старая цена, ₸" name="oldPrice" type="number" defaultValue={v?.oldPrice} />
      <div className="flex items-end pb-2"><FCheck label="Активен" name="isActive" defaultChecked={v ? v.isActive : true} /></div>
    </div>
  );
}
