import { db } from "@/lib/db";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProduct() {
  await pageStaff("products.write", "/admin/products/new");
  const [brands, categories] = await Promise.all([db.brand.findMany({ orderBy: { name: "asc" } }), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  return (
    <>
      <PageHeader title="Новый товар" back={{ href: "/admin/products", label: "Товары" }} description="Товар создаётся черновиком. Добавьте варианты и фото, затем опубликуйте." />
      <Panel><ProductForm brands={brands} categories={categories} /></Panel>
    </>
  );
}
