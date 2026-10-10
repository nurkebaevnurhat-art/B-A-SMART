import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageStaff } from "@/server/guards";
import { PERMISSIONS } from "@/server/auth/permissions";
import { PageHeader, Panel, F, FCheck, FSelect, Table, Td } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { createStaff, saveRolePermissions, updateStaff } from "../_actions/system";

export default async function Staff() {
  const me = await pageStaff("staff.manage", "/admin/staff");
  const [staff, roles] = await Promise.all([
    db.user.findMany({ where: { role: { key: { in: ["owner", "admin", "staff"] } } }, include: { role: true, sessions: { orderBy: { lastSeenAt: "desc" }, take: 1 } }, orderBy: { createdAt: "asc" } }),
    db.role.findMany({ where: { key: { in: ["admin", "staff"] } }, orderBy: { key: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Сотрудники и роли" description="Разрешения проверяются на сервере при каждом действии" />
      <Table head={["Сотрудник", "Email", "Роль / доступ", "Последний вход"]}>
        {staff.map((u) => (
          <tr key={u.id}>
            <Td>{u.name}{u.id === me.id && <span className="ml-1 text-xs text-muted">(вы)</span>}</Td>
            <Td>{u.email}</Td>
            <Td>
              {u.id === me.id ? (
                u.role.name
              ) : (
                <ActionForm action={updateStaff} submitLabel="OK" inline submitVariant="outline">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="roleKey" defaultValue={u.role.key} className="h-9 rounded-lg border border-line px-2 text-sm" aria-label="Роль">
                    <option value="owner">Владелец</option>
                    <option value="admin">Администратор</option>
                    <option value="staff">Сотрудник</option>
                    <option value="customer">Убрать доступ (покупатель)</option>
                  </select>
                  <FCheck label="Активен" name="isActive" defaultChecked={u.isActive} />
                </ActionForm>
              )}
            </Td>
            <Td className="text-muted">{u.sessions[0] ? formatDateTime(u.sessions[0].lastSeenAt) : "—"}</Td>
          </tr>
        ))}
      </Table>
      <div className="mt-6 grid gap-6 2xl:grid-cols-2">
        <Panel title="Добавить сотрудника">
          <ActionForm action={createStaff} submitLabel="Добавить" resetOnSuccess>
            <div className="grid gap-3 md:grid-cols-2">
              <F label="Имя" name="name" required />
              <F label="Email (логин)" name="email" type="email" required />
              <F label="Телефон" name="phone" />
              <F label="Временный пароль" name="password" type="password" required hint="Минимум 10 символов; попросите сменить при первом входе" />
              <FSelect label="Роль" name="roleKey" defaultValue="staff" options={[{ value: "staff", label: "Сотрудник" }, { value: "admin", label: "Администратор" }, { value: "owner", label: "Владелец" }]} />
            </div>
          </ActionForm>
        </Panel>
        {roles.map((r) => (
          <Panel key={r.id} title={`Разрешения: ${r.name}`}>
            <ActionForm action={saveRolePermissions} submitLabel="Сохранить разрешения">
              <input type="hidden" name="key" value={r.key} />
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(PERMISSIONS).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="permissions[]" value={k} defaultChecked={r.permissions.includes(k)} disabled={k === "staff.manage"} className="accent-[var(--c-ink)]" />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Управление сотрудниками доступно только владельцу.</p>
            </ActionForm>
          </Panel>
        ))}
      </div>
    </>
  );
}
