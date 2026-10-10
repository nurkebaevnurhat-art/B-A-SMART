import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { hasPermission } from "@/server/auth/permissions";
import { DEFAULT_CHECKS, parseChecks } from "@/server/services/products";
import { PageHeader, Panel, F } from "@/components/admin/ui";
import { UnitForm } from "@/components/admin/UnitForm";
import { ActionForm } from "@/components/admin/ActionForm";
import { Badge } from "@/components/ui/Badge";
import { deleteUnitImage, saveInspection, setUnitStatus, uploadUnitImage } from "../../_actions/used";
import { UNIT_STATUS } from "@/components/admin/labels";

export default async function EditUnit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageStaff("used.write", `/admin/used/${id}`);
  const [u, models] = await Promise.all([
    db.usedUnit.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, inspection: { include: { inspector: { select: { name: true } } } }, product: true } }),
    db.product.findMany({ where: { condition: "USED" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!u) notFound();
  const saved = parseChecks(u.inspection?.checks ?? []);
  const checks = [...saved, ...DEFAULT_CHECKS.filter((d) => !saved.some((s) => s.key === d.key)).map((d) => ({ ...d, result: "NOT_TESTED" as const, note: undefined }))];
  const order = u.soldOrderId ? await db.order.findUnique({ where: { id: u.soldOrderId }, select: { id: true, number: true } }) : null;
  const canInspect = hasPermission(user, "inspections.write");
  const status = (s: "DRAFT" | "AVAILABLE" | "ARCHIVED", label: string, variant: "accent" | "outline" | "ghost" = "outline") => (
    <ActionForm action={setUnitStatus} submitLabel={label} inline submitVariant={variant}>
      <input type="hidden" name="id" value={u.id} />
      <input type="hidden" name="status" value={s} />
    </ActionForm>
  );
  return (
    <>
      <PageHeader
        title={`${u.product.name} · ${u.code}`}
        back={{ href: "/admin/used", label: "Б/у экземпляры" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={UNIT_STATUS[u.status][1]}>{UNIT_STATUS[u.status][0]}</Badge>
            {u.status === "RESERVED" && u.reservedUntil && <span>до {formatDateTime(u.reservedUntil)}</span>}
            {order && <Link href={`/admin/orders/${order.id}`} className="text-primary">заказ {order.number}</Link>}
            {u.status === "AVAILABLE" && <Link href={`/used/${u.code}`} target="_blank" className="text-primary">На сайте ↗</Link>}
          </span>
        }
        actions={
          u.status !== "SOLD" && (
            <>
              {u.status !== "AVAILABLE" && status("AVAILABLE", "Выставить в продажу", "accent")}
              {u.status === "AVAILABLE" && status("DRAFT", "Снять с продажи")}
              {u.status !== "ARCHIVED" && status("ARCHIVED", "В архив", "ghost")}
            </>
          )
        }
      />
      <div className="grid gap-6 2xl:grid-cols-2">
        <Panel title="Данные экземпляра"><UnitForm unit={u} models={models} /></Panel>
        <div className="space-y-6">
          <Panel title={`Фото этого экземпляра (${u.images.length})`}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {u.images.map((im) => (
                <div key={im.id} className="rounded-xl border border-line p-1.5">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-surface"><Image src={im.url} alt="" fill sizes="140px" className="object-cover" unoptimized /></div>
                  <ActionForm action={deleteUnitImage} submitLabel="Удалить" inline submitVariant="ghost" confirm="Удалить фото?"><input type="hidden" name="id" value={im.id} /></ActionForm>
                </div>
              ))}
            </div>
            {!u.images.length && <p className="text-sm text-accent-dark">Добавьте реальные фотографии именно этого устройства (лицевая и задняя сторона, дефекты крупным планом).</p>}
            <ActionForm action={uploadUnitImage} submitLabel="Загрузить фото" resetOnSuccess className="mt-4 border-t border-line pt-4">
              <input type="hidden" name="usedUnitId" value={u.id} />
              <input type="hidden" name="alt" value={`${u.product.name} ${u.code}`} />
              <input type="file" name="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-sm" />
            </ActionForm>
          </Panel>
          <Panel title="Отчёт проверки">
            {u.inspection && <p className="mb-4 text-xs text-muted">Последнее изменение: {formatDateTime(u.inspection.updatedAt)}{u.inspection.inspector ? `, ${u.inspection.inspector.name}` : ""}</p>}
            {canInspect ? (
              <ActionForm action={saveInspection} submitLabel="Сохранить отчёт">
                <input type="hidden" name="usedUnitId" value={u.id} />
                <div className="divide-y divide-line">
                  {checks.map((c) => (
                    <div key={c.key} className="grid gap-2 py-2.5 sm:grid-cols-[1fr_150px_1fr] sm:items-center">
                      <input type="hidden" name="key[]" value={c.key} />
                      <input type="hidden" name="label[]" value={c.label} />
                      <span className="text-sm">{c.label}</span>
                      <select name="result[]" defaultValue={c.result} className="h-9 rounded-lg border border-line px-2 text-sm">
                        <option value="PASS">Исправно</option>
                        <option value="FAIL">Неисправно</option>
                        <option value="NOT_TESTED">Не проверялось</option>
                      </select>
                      <input name="note[]" defaultValue={c.note} placeholder="Примечание" className="h-9 rounded-lg border border-line px-2 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="mt-3"><F label="Итог проверки" name="summary" defaultValue={u.inspection?.summary} /></div>
              </ActionForm>
            ) : (
              <p className="text-sm text-muted">Нет права на заполнение отчётов проверки.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
