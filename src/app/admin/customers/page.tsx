import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatPhone } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PageHeader, SearchBar, Table, Td } from "@/components/admin/ui";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await pageStaff("customers.read", "/admin/customers");
  const sp = await searchParams;
  const users = await db.user.findMany({
    where: {
      role: { key: "customer" },
      ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q.replace(/\D/g, "").slice(-10) || sp.q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { orders: true, installmentApps: true } } },
  });
  return (
    <>
      <PageHeader title="Покупатели" description={`Зарегистрировано: ${users.length}${users.length === 200 ? "+" : ""}`} />
      <SearchBar placeholder="Имя, email или телефон" defaultValue={sp.q} />
      <Table head={["Имя", "Телефон", "Email", "Город", "Заказов", "Заявок", "Регистрация"]} empty={!users.length}>
        {users.map((u) => (
          <tr key={u.id}>
            <Td><Link href={`/admin/customers/${u.id}`} className="text-primary">{u.name}</Link></Td>
            <Td>{u.phone ? formatPhone(u.phone) : "—"}</Td>
            <Td>{u.email ?? "—"}</Td>
            <Td>{u.city ?? "—"}</Td>
            <Td>{u._count.orders}</Td>
            <Td>{u._count.installmentApps}</Td>
            <Td className="text-muted">{formatDate(u.createdAt)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
