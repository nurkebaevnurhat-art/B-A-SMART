import { db } from "@/lib/db";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel, F, FCheck, FSelect } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { deleteBanner, saveBanner } from "../_actions/marketing";

type Banner = Awaited<ReturnType<typeof db.banner.findMany>>[number];

function Fields({ b }: { b?: Banner }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <F label="Заголовок (рус.)" name="title" defaultValue={b?.title} required />
      <F label="Заголовок (каз.)" name="titleKk" defaultValue={b?.titleKk} />
      <F label="Подзаголовок (рус.)" name="subtitle" defaultValue={b?.subtitle} />
      <F label="Подзаголовок (каз.)" name="subtitleKk" defaultValue={b?.subtitleKk} />
      <F label="Текст кнопки" name="ctaLabel" defaultValue={b?.ctaLabel} />
      <F label="Ссылка кнопки" name="ctaHref" defaultValue={b?.ctaHref} placeholder="/catalog/smartphones" />
      <F label="URL изображения" name="imageUrl" defaultValue={b?.imageUrl} hint="Или загрузите файл ниже. Пусто — иллюстрация" />
      <label className="block text-xs font-medium text-graphite">Файл изображения<input type="file" name="file" accept="image/*" className="mt-1 block text-sm" /></label>
      <FSelect label="Оформление" name="theme" defaultValue={b?.theme} options={[{ value: "dark", label: "Тёмное" }, { value: "brand", label: "Фирменное" }, { value: "light", label: "Светлое" }]} />
      <F label="Порядок" name="sortOrder" type="number" defaultValue={b?.sortOrder ?? 0} />
      <input type="hidden" name="placement" value="hero" />
      <FCheck label="Показывать" name="isActive" defaultChecked={b ? b.isActive : true} />
    </div>
  );
}

export default async function Banners() {
  await pageStaff("banners.write", "/admin/banners");
  const banners = await db.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title="Баннеры главной страницы" description="Слайды hero-блока. Не размещайте обещания, которые магазин не может выполнить." />
      <div className="space-y-4">
        {banners.map((b) => (
          <Panel key={b.id} title={b.title} actions={<ActionForm action={deleteBanner} submitLabel="Удалить" inline submitVariant="ghost" confirm="Удалить баннер?"><input type="hidden" name="id" value={b.id} /></ActionForm>}>
            <ActionForm action={saveBanner} submitLabel="Сохранить" submitVariant="outline"><input type="hidden" name="id" value={b.id} /><Fields b={b} /></ActionForm>
          </Panel>
        ))}
        <Panel title="Новый баннер"><ActionForm action={saveBanner} submitLabel="Добавить" resetOnSuccess><Fields /></ActionForm></Panel>
      </div>
    </>
  );
}
