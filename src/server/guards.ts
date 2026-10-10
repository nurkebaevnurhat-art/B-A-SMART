import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth/session";
import { hasPermission, type Permission } from "./auth/permissions";

/** Для страниц: требует вход, иначе отправляет на страницу входа */
export async function pageUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function pageStaff(perm: Permission, next = "/admin") {
  const user = await pageUser(next);
  if (!hasPermission(user, "admin.access")) redirect("/account");
  if (!hasPermission(user, perm)) redirect("/admin?denied=1");
  return user;
}
