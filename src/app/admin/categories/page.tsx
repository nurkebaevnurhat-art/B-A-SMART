import { db } from "@/lib/db";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel, F, FSelect } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveBrand, saveCategory } from "../_actions/system";

export default async function Categories() {
  await pageStaff("products.write", "/admin/categories");
  const [cats, brands] = await Promise.all([
    db.category.findMany({ orderBy: [{ group: "desc" }, { sortOrder: "asc" }], include: { _count: { select: { products: true } } } }),
    db.brand.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);
  const catFields = (c?: (typeof cats)[number]) => (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <F label="Название (рус.)" name="nameRu" defaultValue={c?.nameRu} required />
      <F label="Атауы (қаз.)" name="nameKk" defaultValue={c?.nameKk} required />
      <F label="URL" name="slug" defaultValue={c?.slug} />
      <FSelect label="Группа" name="group" defaultValue={c?.group} options={[{ value: "devices", label: "Устройства" }, { value: "accessories", label: "Аксессуары" }]} />
      <F label="Порядок" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} />
    </div>
  );
  return (
    <>
      <PageHeader title="Категории и бренды" />
      <div className="grid gap-6 2xl:grid-cols-[2fr_1fr]">
        <Panel title="Категории">
          <div className="space-y-3">
            {cats.map((c) => (
              <ActionForm key={c.id} action={saveCategory} submitLabel={`Сохранить (${c._count.products} тов.)`} submitVariant="outline" className="rounded-xl border border-line p-3">
                <input type="hidden" name="id" value={c.id} />
                {catFields(c)}
              </ActionForm>
            ))}
            <ActionForm action={saveCategory} submitLabel="Добавить категорию" resetOnSuccess className="rounded-xl bg-surface p-3">{catFields()}</ActionForm>
          </div>
        </Panel>
        <Panel title="Бренды">
          <div className="space-y-2">
            {brands.map((b) => (
              <ActionForm key={b.id} action={saveBrand} submitLabel="OK" inline submitVariant="outline">
                <input type="hidden" name="id" value={b.id} />
                <input name="name" defaultValue={b.name} className="h-9 flex-1 rounded-lg border border-line px-2 text-sm" aria-label="Бренд" />
                <input name="sortOrder" type="number" defaultValue={b.sortOrder} className="h-9 w-16 rounded-lg border border-line px-2 text-sm" aria-label="Порядок" />
                <span className="w-10 text-xs text-muted">{b._count.products}</span>
              </ActionForm>
            ))}
            <ActionForm action={saveBrand} submitLabel="Добавить" inline resetOnSuccess>
              <input name="name" placeholder="Новый бренд" className="h-9 flex-1 rounded-lg border border-line px-2 text-sm" aria-label="Новый бренд" />
            </ActionForm>
          </div>
        </Panel>
      </div>
    </>
  );
}
