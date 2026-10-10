import { handler } from "@/lib/api";
import { requireUser } from "@/server/auth/session";

export const GET = handler(async () => {
  const u = await requireUser();
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, city: u.city, address: u.address, locale: u.locale, role: u.role.key, permissions: u.role.key === "owner" ? ["*"] : u.role.permissions };
});
