import { ActionForm } from "./ActionForm";
import { F, FArea, FCheck, FSelect } from "./ui";
import { saveProduct } from "@/app/admin/_actions/products";

type P = {
  id?: string; name?: string; slug?: string; model?: string; modelKey?: string | null; brandId?: string; categoryId?: string; kind?: string; condition?: string;
  description?: string; descriptionKk?: string | null; equipment?: string | null; warranty?: string | null; seoTitle?: string | null; seoDescription?: string | null;
  isNewArrival?: boolean; isFeatured?: boolean; installmentAvailable?: boolean;
};

export function ProductForm({ product = {}, brands, categories, specsText = "", compat = "" }: { product?: P; brands: { id: string; name: string }[]; categories: { id: string; nameRu: string }[]; specsText?: string; compat?: string }) {
  return (
    <ActionForm action={saveProduct} submitLabel={product.id ? "Сохранить товар" : "Создать черновик"}>
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <F label="Название" name="name" defaultValue={product.name} required className="md:col-span-2" />
        <F label="Модель" name="model" defaultValue={product.model} required hint="Например: iPhone 16" />
        <F label="Ключ модели (совместимость)" name="modelKey" defaultValue={product.modelKey} hint="Например: iphone-16. Одинаков у новых и б/у этой модели" />
        <F label="URL (slug)" name="slug" defaultValue={product.slug} hint="Пусто — сформируется из названия" />
        <FSelect label="Бренд" name="brandId" defaultValue={product.brandId} options={brands.map((b) => ({ value: b.id, label: b.name }))} />
        <FSelect label="Категория" name="categoryId" defaultValue={product.categoryId} options={categories.map((c) => ({ value: c.id, label: c.nameRu }))} />
        <FSelect label="Тип" name="kind" defaultValue={product.kind} options={[{ value: "SMARTPHONE", label: "Смартфон" }, { value: "TABLET", label: "Планшет" }, { value: "WATCH", label: "Часы" }, { value: "HEADPHONES", label: "Наушники" }, { value: "ACCESSORY", label: "Аксессуар" }]} />
        <FSelect label="Состояние" name="condition" defaultValue={product.condition} options={[{ value: "NEW", label: "Новый (варианты и остатки)" }, { value: "REFURBISHED", label: "Восстановленный (варианты и остатки)" }, { value: "USED", label: "Б/у — модель для экземпляров" }]} />
        <FArea label="Описание (рус.)" name="description" defaultValue={product.description} rows={4} className="md:col-span-2" />
        <FArea label="Описание (каз.)" name="descriptionKk" defaultValue={product.descriptionKk} rows={3} className="md:col-span-2" />
        <FArea label="Комплектация" name="equipment" defaultValue={product.equipment} rows={2} />
        <FArea label="Условия гарантии" name="warranty" defaultValue={product.warranty} rows={2} hint="Указывайте только подтверждённые условия" />
        <FArea label="Характеристики" name="specsText" defaultValue={specsText} rows={10} className="md:col-span-2" hint="По одной на строку: Группа | Параметр | Значение. Только характеристики этой модели." />
        <F label="Совместимые модели (для аксессуаров)" name="compat" defaultValue={compat} className="md:col-span-2" hint="Ключи моделей через запятую: iphone-16, iphone-15" />
        <F label="SEO-заголовок" name="seoTitle" defaultValue={product.seoTitle} />
        <F label="SEO-описание" name="seoDescription" defaultValue={product.seoDescription} />
        <div className="flex flex-wrap gap-6 md:col-span-2">
          <FCheck label="Новинка" name="isNewArrival" defaultChecked={product.isNewArrival} />
          <FCheck label="Рекомендуемый" name="isFeatured" defaultChecked={product.isFeatured} />
          <FCheck label="Участвует в рассрочке" name="installmentAvailable" defaultChecked={product.installmentAvailable} />
        </div>
      </div>
    </ActionForm>
  );
}
