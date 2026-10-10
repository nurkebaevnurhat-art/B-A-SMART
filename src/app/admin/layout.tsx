import type { Metadata } from "next";
import { pageStaff } from "@/server/guards";
import { hasPermission, type Permission } from "@/server/auth/permissions";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Админ-панель", template: "%s — Админ B&A SMART" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/admin", label: "Показатели", group: "Обзор", perm: "dashboard.read" },
  { href: "/admin/orders", label: "Заказы", group: "Продажи", perm: "orders.read" },
  { href: "/admin/payments", label: "Платежи", group: "Продажи", perm: "payments.read" },
  { href: "/admin/installments", label: "Рассрочка", group: "Продажи", perm: "installments.read" },
  { href: "/admin/customers", label: "Покупатели", group: "Продажи", perm: "customers.read" },
  { href: "/admin/support", label: "Поддержка", group: "Продажи", perm: "support.write" },
  { href: "/admin/products", label: "Товары", group: "Каталог", perm: "products.read" },
  { href: "/admin/used", label: "Б/у экземпляры", group: "Каталог", perm: "used.write" },
  { href: "/admin/inventory", label: "Остатки", group: "Каталог", perm: "inventory.write" },
  { href: "/admin/categories", label: "Категории и бренды", group: "Каталог", perm: "products.write" },
  { href: "/admin/promo", label: "Промокоды", group: "Маркетинг", perm: "promo.write" },
  { href: "/admin/banners", label: "Баннеры", group: "Маркетинг", perm: "banners.write" },
  { href: "/admin/reviews", label: "Отзывы", group: "Маркетинг", perm: "reviews.moderate" },
  { href: "/admin/settings", label: "Настройки магазина", group: "Система", perm: "settings.write" },
  { href: "/admin/staff", label: "Сотрудники и роли", group: "Система", perm: "staff.manage" },
  { href: "/admin/audit", label: "Журнал действий", group: "Система", perm: "audit.read" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageStaff("admin.access");
  const items = NAV.filter((n) => hasPermission(user, n.perm)).map(({ perm: _p, ...n }) => (void _p, n));
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[256px_1fr]">
      <AdminNav items={items} user={{ name: user.name, role: user.role.name }} />
      <main id="main" className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
