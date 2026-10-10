import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, SearchBar, Table, Td } from "@/components/admin/ui";

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await pageStaff("audit.read", "/admin/audit");
  const sp = await searchParams;
  const logs = await db.auditLog.findMany({
    where: sp.q ? { OR: [{ action: { contains: sp.q } }, { entity: { contains: sp.q } }, { entityId: sp.q }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Журнал административных действий" description="Последние 200 записей" />
      <SearchBar placeholder="Действие, сущность или ID" defaultValue={sp.q} />
      <Table head={["Время", "Сотрудник", "Действие", "Объект", "Данные", "IP"]} empty={!logs.length}>
        {logs.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</Td>
            <Td>{l.actor?.name ?? "система"}</Td>
            <Td className="font-mono text-xs">{l.action}</Td>
            <Td className="text-xs">{l.entity} <span className="text-muted">{l.entityId}</span></Td>
            <Td className="max-w-[360px] truncate font-mono text-[11px] text-muted">{l.data ? JSON.stringify(l.data) : ""}</Td>
            <Td className="text-xs text-muted">{l.ip}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
