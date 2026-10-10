/** Список разрешений административной панели. Проверяются на сервере. */
export const PERMISSIONS = {
  "admin.access": "Вход в админ-панель",
  "dashboard.read": "Просмотр показателей",
  "products.read": "Просмотр товаров",
  "products.write": "Создание и редактирование товаров",
  "products.publish": "Публикация и архивирование товаров",
  "inventory.write": "Управление остатками",
  "used.write": "Учёт б/у экземпляров",
  "inspections.write": "Отчёты проверки б/у",
  "orders.read": "Просмотр заказов",
  "orders.write": "Изменение статусов заказов",
  "customers.read": "Просмотр покупателей",
  "payments.read": "Просмотр платежей",
  "installments.read": "Просмотр заявок на рассрочку",
  "installments.write": "Обработка заявок и графиков",
  "promo.write": "Промокоды",
  "reviews.moderate": "Модерация отзывов",
  "banners.write": "Баннеры",
  "settings.write": "Настройки магазина",
  "support.write": "Ответы в поддержке",
  "staff.manage": "Сотрудники, роли и разрешения",
  "audit.read": "Журнал действий",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const DEFAULT_ROLES: { key: string; name: string; permissions: Permission[] }[] = [
  { key: "owner", name: "Владелец", permissions: ALL_PERMISSIONS },
  {
    key: "admin",
    name: "Администратор",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "staff.manage"),
  },
  {
    key: "staff",
    name: "Сотрудник",
    permissions: [
      "admin.access",
      "dashboard.read",
      "products.read",
      "inventory.write",
      "used.write",
      "inspections.write",
      "orders.read",
      "orders.write",
      "customers.read",
      "installments.read",
      "support.write",
    ],
  },
  { key: "customer", name: "Покупатель", permissions: [] },
];

export function hasPermission(
  user: { role: { key: string; permissions: string[] } } | null | undefined,
  perm: Permission,
): boolean {
  if (!user) return false;
  if (user.role.key === "owner") return true;
  return user.role.permissions.includes(perm);
}
