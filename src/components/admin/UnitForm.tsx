import { ActionForm } from "./ActionForm";
import { F, FArea, FSelect } from "./ui";
import { saveUnit } from "@/app/admin/_actions/used";

type U = { id?: string; productId?: string; color?: string | null; colorHex?: string | null; storageGb?: number | null; price?: number; oldPrice?: number | null; grade?: string; bodyCondition?: string; screenCondition?: string; batteryHealth?: number | null; defects?: string | null; repairs?: string | null; equipment?: string | null; warranty?: string | null; serialMasked?: string | null };

export function UnitForm({ unit = {}, models }: { unit?: U; models: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveUnit} submitLabel={unit.id ? "Сохранить" : "Создать черновик"}>
      {unit.id && <input type="hidden" name="id" value={unit.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <FSelect label="Модель (товар с состоянием «Б/у»)" name="productId" defaultValue={unit.productId} options={models.map((m) => ({ value: m.id, label: m.name }))} className="md:col-span-2" />
        <F label="Цвет" name="color" defaultValue={unit.color} />
        <F label="HEX цвета" name="colorHex" defaultValue={unit.colorHex} placeholder="#1F252B" />
        <F label="Память, ГБ" name="storageGb" type="number" defaultValue={unit.storageGb} />
        <FSelect label="Категория состояния" name="grade" defaultValue={unit.grade} options={[{ value: "EXCELLENT", label: "Отличное" }, { value: "GOOD", label: "Хорошее" }, { value: "FAIR", label: "Удовлетворительное" }]} />
        <F label="Цена, ₸" name="price" type="number" defaultValue={unit.price} required />
        <F label="Старая цена, ₸" name="oldPrice" type="number" defaultValue={unit.oldPrice} />
        <F label="Состояние корпуса" name="bodyCondition" defaultValue={unit.bodyCondition} required />
        <F label="Состояние экрана" name="screenCondition" defaultValue={unit.screenCondition} required />
        <F label="Ёмкость аккумулятора, %" name="batteryHealth" type="number" defaultValue={unit.batteryHealth} hint="Только если измерена. Пусто — «не измерялась»" />
        <F label="IMEI / S/N (последние 4–6 символов)" name="serialMasked" defaultValue={unit.serialMasked?.replace(/^…/, "")} hint="Полный номер на сайте не храним" />
        <FArea label="Известные дефекты" name="defects" defaultValue={unit.defects} />
        <FArea label="Ремонты и заменённые детали" name="repairs" defaultValue={unit.repairs} hint="Только достоверные сведения; оригинальность деталей без подтверждения не указывать" />
        <FArea label="Комплектация" name="equipment" defaultValue={unit.equipment} />
        <FArea label="Гарантия магазина" name="warranty" defaultValue={unit.warranty} />
      </div>
    </ActionForm>
  );
}
