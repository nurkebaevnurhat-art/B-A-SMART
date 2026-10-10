import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, SearchBar, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

import { UNIT_STATUS } from "@/components/admin/labels";
const GRADE = { EXCELLENT: "Отличное", GOOD: "Хорошее", FAIR: "Удовл." };

export default async function AdminUsed({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await pageStaff("used.write", "/admin/used");
  const sp = await searchParams;
  const where: Prisma.UsedUnitWhereInput = {
    ...(sp.q ? { OR: [{ code: { contains: sp.q, mode: "insensitive" } }, { product: { name: { contains: sp.q, mode: "insensitive" } } }, { serialMasked: { contains: sp.q } }] } : {}),
    ...(sp.status ? { status: sp.status as "AVAILABLE" } : {}),
  };
  const units = await db.usedUnit.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { product: { select: { name: true } }, _count: { select: { images: true } }, inspection: { select: { checks: true } } } });
  return (
    <>
      <PageHeader title="Б/у экземпляры" description="Каждый экземпляр — отдельная запись со своими фото, состоянием и отчётом проверки" actions={<ButtonLink href="/admin/used/new" size="sm">+ Экземпляр</ButtonLink>} />
      <SearchBar placeholder="Код экземпляра, модель или конец IMEI" defaultValue={sp.q}>
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-lg border border-line px-3 text-sm">
          <option value="">Все статусы</option>
          {Object.entries(UNIT_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </SearchBar>
      <Table head={["Код", "Модель", "Память / цвет", "Состояние", "АКБ", "Фото", "Цена", "Статус"]} empty={!units.length}>
        {units.map((u) => {
          const checks = Array.isArray(u.inspection?.checks) ? (u.inspection!.checks as { result: string }[]) : [];
          const untested = checks.filter((c) => c.result === "NOT_TESTED").length;
          return (
            <tr key={u.id} className="hover:bg-surface/60">
              <Td><Link href={`/admin/used/${u.id}`} className="font-mono font-medium text-primary">{u.code}</Link></Td>
              <Td>{u.product.name}</Td>
              <Td>{[u.storageGb && `${u.storageGb} ГБ`, u.color].filter(Boolean).join(" · ")}</Td>
              <Td>{GRADE[u.grade]}{untested === checks.length && checks.length ? <span className="block text-xs text-accent-dark">отчёт не заполнен</span> : null}</Td>
              <Td>{u.batteryHealth ? `${u.batteryHealth}%` : "—"}</Td>
              <Td>{u._count.images || <span className="text-accent-dark">нет</span>}</Td>
              <Td>{formatPrice(u.price)}</Td>
              <Td><Badge tone={UNIT_STATUS[u.status][1]}>{UNIT_STATUS[u.status][0]}</Badge></Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
