import { db } from "@/lib/db";
import { pageStaff } from "@/server/guards";
import { PageHeader, Panel } from "@/components/admin/ui";
import { UnitForm } from "@/components/admin/UnitForm";

export default async function NewUnit({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  await pageStaff("used.write", "/admin/used/new");
  const sp = await searchParams;
  const models = await db.product.findMany({ where: { condition: "USED", status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Новый б/у экземпляр" back={{ href: "/admin/used", label: "Б/у экземпляры" }} description="Если модели нет в списке — создайте товар с состоянием «Б/у» в разделе «Товары»." />
      <Panel><UnitForm models={models} unit={{ productId: sp.product }} /></Panel>
    </>
  );
}
