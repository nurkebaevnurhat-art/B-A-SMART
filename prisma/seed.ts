/**
 * Демонстрационные данные B&A SMART.
 * Цены и остатки — примерные. Характеристики — по открытым данным производителей;
 * перед запуском продаж их нужно сверить и заменить иллюстрации реальными фотографиями.
 *
 * Запуск: npm run db:seed  (безопасно перезапускать — данные каталога пересоздаются)
 */
import { PrismaClient, type ProductCondition, type ProductKind, type UsedGrade } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { DEFAULT_ROLES } from "../src/server/auth/permissions";

const db = new PrismaClient();

type Spec = [string, string][];
const specs = (groups: Record<string, Spec>) =>
  Object.entries(groups).map(([group, items]) => ({ group, items: items.map(([label, value]) => ({ label, value })) }));

type V = { color?: string; hex?: string; storage?: number; ram?: number; price: number; old?: number; stock: number };

type P = {
  slug: string;
  name: string;
  model: string;
  modelKey?: string;
  brand: string;
  category: string;
  kind: ProductKind;
  condition?: ProductCondition;
  isNew?: boolean;
  featured?: boolean;
  installment?: boolean;
  sales?: number;
  description: string;
  descriptionKk?: string;
  equipment?: string;
  warranty?: string;
  specs?: ReturnType<typeof specs>;
  variants?: V[];
  compat?: string[];
};

const BRANDS = ["Apple", "Samsung", "Xiaomi", "Google", "Spigen", "Anker", "UGREEN", "Jabra"];

const CATEGORIES = [
  { slug: "smartphones", ru: "Смартфоны", kk: "Смартфондар", group: "devices" },
  { slug: "tablets", ru: "Планшеты", kk: "Планшеттер", group: "devices" },
  { slug: "smartwatches", ru: "Смарт-часы", kk: "Смарт-сағаттар", group: "devices" },
  { slug: "headphones", ru: "Наушники", kk: "Құлаққаптар", group: "accessories" },
  { slug: "cases", ru: "Чехлы", kk: "Қаптар", group: "accessories" },
  { slug: "screen-protectors", ru: "Защитные стёкла", kk: "Қорғаныш әйнектер", group: "accessories" },
  { slug: "chargers", ru: "Зарядные устройства", kk: "Зарядтағыштар", group: "accessories" },
  { slug: "cables", ru: "Кабели", kk: "Кабельдер", group: "accessories" },
  { slug: "headsets", ru: "Bluetooth-гарнитуры", kk: "Bluetooth-гарнитуралар", group: "accessories" },
  { slug: "powerbanks", ru: "Повербанки", kk: "Повербанктер", group: "accessories" },
  { slug: "other-accessories", ru: "Другие аксессуары", kk: "Басқа аксессуарлар", group: "accessories" },
];

const NEW_WARRANTY = "Официальная гарантия производителя. Срок и условия указываются в гарантийном талоне.";
const APPLE_BOX = "Смартфон, кабель USB‑C, документация";

const USB_C_PHONES = ["iphone-17-pro", "iphone-17", "iphone-16", "iphone-15", "iphone-15-pro", "galaxy-s25-ultra", "galaxy-s25", "galaxy-a55", "galaxy-s23", "xiaomi-14t-pro", "pixel-9"];
const LIGHTNING_PHONES = ["iphone-14", "iphone-14-pro", "iphone-13", "iphone-12"];
const ALL_PHONES = [...USB_C_PHONES, ...LIGHTNING_PHONES];
const MAGSAFE = ["iphone-17-pro", "iphone-17", "iphone-16", "iphone-15", "iphone-15-pro", "iphone-14", "iphone-14-pro", "iphone-13", "iphone-12"];

const PRODUCTS: P[] = [
  // ─── Новые смартфоны ───
  {
    slug: "apple-iphone-17-pro",
    name: "Apple iPhone 17 Pro",
    model: "iPhone 17 Pro",
    modelKey: "iphone-17-pro",
    brand: "Apple",
    category: "smartphones",
    kind: "SMARTPHONE",
    isNew: true,
    featured: true,
    installment: true,
    sales: 41,
    description:
      "Флагман Apple с чипом A19 Pro и тройной камерой 48 МП, включая телефото с 4‑кратным оптическим зумом. Алюминиевый корпус, дисплей ProMotion до 120 Гц.",
    descriptionKk: "A19 Pro чипі және 48 МП үш камерасы бар Apple флагманы. Алюминий корпус, 120 Гц-ке дейінгі ProMotion дисплейі.",
    equipment: APPLE_BOX,
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "6,3″"], ["Тип", "Super Retina XDR OLED"], ["Частота обновления", "ProMotion до 120 Гц"], ["Always-On", "Да"]],
      Процессор: [["Чип", "Apple A19 Pro"]],
      Камеры: [["Основная", "48 МП Fusion"], ["Сверхширокоугольная", "48 МП"], ["Телефото", "48 МП, 4× оптический зум"], ["Фронтальная", "18 МП Center Stage"]],
      "Память и связь": [["Встроенная память", "256 ГБ / 512 ГБ / 1 ТБ"], ["Разъём", "USB‑C (USB 3)"], ["SIM", "eSIM; наличие слота nano‑SIM зависит от региональной версии"]],
      Система: [["Операционная система", "iOS 26"]],
    }),
    variants: [
      { color: "Космический оранжевый", hex: "#D9692B", storage: 256, price: 749990, stock: 4 },
      { color: "Космический оранжевый", hex: "#D9692B", storage: 512, price: 869990, stock: 2 },
      { color: "Глубокий синий", hex: "#2E3A4F", storage: 256, price: 749990, stock: 3 },
      { color: "Серебристый", hex: "#DCDDDF", storage: 256, price: 749990, stock: 2 },
      { color: "Серебристый", hex: "#DCDDDF", storage: 1024, price: 1099990, stock: 1 },
    ],
  },
  {
    slug: "apple-iphone-17",
    name: "Apple iPhone 17",
    model: "iPhone 17",
    modelKey: "iphone-17",
    brand: "Apple",
    category: "smartphones",
    kind: "SMARTPHONE",
    isNew: true,
    featured: true,
    installment: true,
    sales: 37,
    description: "6,3‑дюймовый дисплей ProMotion до 120 Гц, чип A19 и двойная камера 48 МП. Базовая память — 256 ГБ.",
    descriptionKk: "120 Гц-ке дейінгі 6,3 дюймдік ProMotion дисплейі, A19 чипі және 48 МП қос камера.",
    equipment: APPLE_BOX,
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "6,3″"], ["Тип", "Super Retina XDR OLED"], ["Частота обновления", "ProMotion до 120 Гц"]],
      Процессор: [["Чип", "Apple A19"]],
      Камеры: [["Основная", "48 МП Fusion"], ["Сверхширокоугольная", "48 МП"], ["Фронтальная", "18 МП Center Stage"]],
      "Память и связь": [["Встроенная память", "256 ГБ / 512 ГБ"], ["Разъём", "USB‑C"]],
      Система: [["Операционная система", "iOS 26"]],
    }),
    variants: [
      { color: "Чёрный", hex: "#1F2023", storage: 256, price: 529990, stock: 5 },
      { color: "Белый", hex: "#F2F2F0", storage: 256, price: 529990, stock: 3 },
      { color: "Лавандовый", hex: "#C9BFE0", storage: 256, price: 529990, stock: 2 },
      { color: "Шалфей", hex: "#B9C4A8", storage: 512, price: 649990, stock: 2 },
    ],
  },
  {
    slug: "apple-iphone-16",
    name: "Apple iPhone 16",
    model: "iPhone 16",
    modelKey: "iphone-16",
    brand: "Apple",
    category: "smartphones",
    kind: "SMARTPHONE",
    installment: true,
    sales: 64,
    description: "Чип A18, камера 48 МП Fusion, кнопка «Управление камерой» и кнопка действия.",
    descriptionKk: "A18 чипі, 48 МП Fusion камерасы, камераны басқару түймесі және әрекет түймесі.",
    equipment: APPLE_BOX,
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "6,1″"], ["Тип", "Super Retina XDR OLED"]],
      Процессор: [["Чип", "Apple A18"]],
      Камеры: [["Основная", "48 МП Fusion"], ["Сверхширокоугольная", "12 МП"], ["Фронтальная", "12 МП"]],
      "Память и связь": [["Встроенная память", "128 ГБ / 256 ГБ / 512 ГБ"], ["Разъём", "USB‑C"]],
      Особенности: [["Кнопки", "Управление камерой, кнопка действия"], ["Dynamic Island", "Да"]],
    }),
    variants: [
      { color: "Чёрный", hex: "#2B2C2E", storage: 128, price: 429990, old: 459990, stock: 6 },
      { color: "Ультрамарин", hex: "#6C7FD8", storage: 128, price: 429990, old: 459990, stock: 3 },
      { color: "Бирюзовый", hex: "#9CC9C2", storage: 256, price: 499990, stock: 2 },
      { color: "Розовый", hex: "#EBC4D4", storage: 128, price: 429990, old: 459990, stock: 0 },
    ],
  },
  {
    slug: "apple-iphone-15",
    name: "Apple iPhone 15",
    model: "iPhone 15",
    modelKey: "iphone-15",
    brand: "Apple",
    category: "smartphones",
    kind: "SMARTPHONE",
    installment: true,
    sales: 52,
    description: "Dynamic Island, основная камера 48 МП и разъём USB‑C. Чип A16 Bionic.",
    equipment: APPLE_BOX,
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "6,1″"], ["Тип", "Super Retina XDR OLED"]],
      Процессор: [["Чип", "Apple A16 Bionic"]],
      Камеры: [["Основная", "48 МП"], ["Сверхширокоугольная", "12 МП"], ["Фронтальная", "12 МП"]],
      "Память и связь": [["Встроенная память", "128 ГБ / 256 ГБ / 512 ГБ"], ["Разъём", "USB‑C"]],
    }),
    variants: [
      { color: "Чёрный", hex: "#35383B", storage: 128, price: 359990, stock: 4 },
      { color: "Голубой", hex: "#D3E0E7", storage: 128, price: 359990, stock: 3 },
      { color: "Зелёный", hex: "#D9E4D2", storage: 256, price: 419990, stock: 1 },
    ],
  },
  {
    slug: "samsung-galaxy-s25-ultra",
    name: "Samsung Galaxy S25 Ultra",
    model: "Galaxy S25 Ultra",
    modelKey: "galaxy-s25-ultra",
    brand: "Samsung",
    category: "smartphones",
    kind: "SMARTPHONE",
    featured: true,
    installment: true,
    sales: 33,
    description: "6,9‑дюймовый QHD+ дисплей, Snapdragon 8 Elite for Galaxy, камера 200 МП и встроенный S Pen. Титановая рамка.",
    descriptionKk: "6,9 дюймдік QHD+ дисплей, Snapdragon 8 Elite for Galaxy, 200 МП камера және кірістірілген S Pen.",
    equipment: "Смартфон, кабель USB‑C, S Pen, инструмент для извлечения SIM, документация",
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "6,9″"], ["Тип", "Dynamic AMOLED 2X, QHD+"], ["Частота обновления", "1–120 Гц"]],
      Процессор: [["Чипсет", "Snapdragon 8 Elite for Galaxy"], ["Оперативная память", "12 ГБ"]],
      Камеры: [["Основная", "200 МП"], ["Сверхширокоугольная", "50 МП"], ["Телефото 3×", "10 МП"], ["Телефото 5×", "50 МП"], ["Фронтальная", "12 МП"]],
      Аккумулятор: [["Ёмкость", "5000 мА·ч"], ["Проводная зарядка", "до 45 Вт"]],
      "Память и связь": [["Встроенная память", "256 ГБ / 512 ГБ / 1 ТБ"], ["SIM", "nano‑SIM + eSIM"]],
      Система: [["ОС", "Android 15, One UI 7"]],
    }),
    variants: [
      { color: "Титановый серебристо-синий", hex: "#A9B7C6", storage: 256, ram: 12, price: 649990, stock: 3 },
      { color: "Титановый чёрный", hex: "#2F3033", storage: 256, ram: 12, price: 649990, stock: 4 },
      { color: "Титановый серый", hex: "#8A8B8D", storage: 512, ram: 12, price: 729990, stock: 2 },
    ],
  },
  {
    slug: "samsung-galaxy-s25",
    name: "Samsung Galaxy S25",
    model: "Galaxy S25",
    modelKey: "galaxy-s25",
    brand: "Samsung",
    category: "smartphones",
    kind: "SMARTPHONE",
    installment: true,
    sales: 28,
    description: "Компактный флагман с дисплеем 6,2″ 120 Гц и процессором Snapdragon 8 Elite for Galaxy.",
    equipment: "Смартфон, кабель USB‑C, инструмент для извлечения SIM, документация",
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "6,2″"], ["Тип", "Dynamic AMOLED 2X, FHD+"], ["Частота обновления", "до 120 Гц"]],
      Процессор: [["Чипсет", "Snapdragon 8 Elite for Galaxy"], ["Оперативная память", "12 ГБ"]],
      Камеры: [["Основная", "50 МП"], ["Сверхширокоугольная", "12 МП"], ["Телефото 3×", "10 МП"], ["Фронтальная", "12 МП"]],
      Аккумулятор: [["Ёмкость", "4000 мА·ч"], ["Проводная зарядка", "до 25 Вт"]],
      "Память и связь": [["Встроенная память", "128 ГБ / 256 ГБ"], ["SIM", "nano‑SIM + eSIM"]],
    }),
    variants: [
      { color: "Ледяной синий", hex: "#BFD3E6", storage: 128, ram: 12, price: 429990, stock: 3 },
      { color: "Тёмно-синий", hex: "#2D3A55", storage: 256, ram: 12, price: 469990, stock: 2 },
    ],
  },
  {
    slug: "samsung-galaxy-a55",
    name: "Samsung Galaxy A55 5G",
    model: "Galaxy A55 5G",
    modelKey: "galaxy-a55",
    brand: "Samsung",
    category: "smartphones",
    kind: "SMARTPHONE",
    installment: true,
    sales: 71,
    description: "Super AMOLED 6,6″ 120 Гц, защита IP67 и аккумулятор 5000 мА·ч.",
    equipment: "Смартфон, кабель USB‑C, инструмент для извлечения SIM, документация",
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "6,6″"], ["Тип", "Super AMOLED, FHD+"], ["Частота обновления", "до 120 Гц"]],
      Процессор: [["Чипсет", "Exynos 1480"], ["Оперативная память", "8 ГБ"]],
      Камеры: [["Основная", "50 МП"], ["Сверхширокоугольная", "12 МП"], ["Макро", "5 МП"], ["Фронтальная", "32 МП"]],
      Аккумулятор: [["Ёмкость", "5000 мА·ч"], ["Проводная зарядка", "до 25 Вт"]],
      Защита: [["Пыле- и влагозащита", "IP67"]],
    }),
    variants: [
      { color: "Тёмно-синий", hex: "#2A3348", storage: 128, ram: 8, price: 179990, old: 199990, stock: 8 },
      { color: "Лиловый", hex: "#CBB8DD", storage: 256, ram: 8, price: 199990, stock: 4 },
    ],
  },
  {
    slug: "xiaomi-14t-pro",
    name: "Xiaomi 14T Pro",
    model: "14T Pro",
    modelKey: "xiaomi-14t-pro",
    brand: "Xiaomi",
    category: "smartphones",
    kind: "SMARTPHONE",
    installment: true,
    sales: 19,
    description: "Оптика Leica, дисплей 144 Гц и зарядка HyperCharge 120 Вт.",
    equipment: "Смартфон, адаптер питания, кабель USB‑C, чехол, инструмент для извлечения SIM, документация",
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "6,67″"], ["Тип", "AMOLED 1.5K"], ["Частота обновления", "до 144 Гц"]],
      Процессор: [["Чипсет", "MediaTek Dimensity 9300+"], ["Оперативная память", "12 ГБ"]],
      Камеры: [["Основная", "50 МП, Light Fusion 900"], ["Телефото", "50 МП, 2,6×"], ["Сверхширокоугольная", "12 МП"], ["Фронтальная", "32 МП"]],
      Аккумулятор: [["Ёмкость", "5000 мА·ч"], ["Проводная зарядка", "120 Вт"], ["Беспроводная зарядка", "50 Вт"]],
    }),
    variants: [
      { color: "Титановый чёрный", hex: "#25272A", storage: 256, ram: 12, price: 329990, stock: 3 },
      { color: "Титановый синий", hex: "#41546E", storage: 512, ram: 12, price: 369990, stock: 2 },
    ],
  },
  {
    slug: "google-pixel-9",
    name: "Google Pixel 9",
    model: "Pixel 9",
    modelKey: "pixel-9",
    brand: "Google",
    category: "smartphones",
    kind: "SMARTPHONE",
    sales: 6,
    description: "Чистый Android, чип Tensor G4 и камера 50 МП с обработкой Google.",
    equipment: "Смартфон, кабель USB‑C, документация",
    warranty: "Гарантия магазина. Срок указывается в гарантийном талоне.",
    specs: specs({
      Дисплей: [["Диагональ", "6,3″"], ["Тип", "Actua OLED"], ["Частота обновления", "до 120 Гц"]],
      Процессор: [["Чип", "Google Tensor G4"], ["Оперативная память", "12 ГБ"]],
      Камеры: [["Основная", "50 МП"], ["Сверхширокоугольная", "48 МП"], ["Фронтальная", "10,5 МП"]],
      Аккумулятор: [["Ёмкость", "4700 мА·ч"]],
    }),
    variants: [{ color: "Обсидиан", hex: "#202124", storage: 128, ram: 12, price: 349990, stock: 2 }],
  },
  // ─── Восстановленные ───
  {
    slug: "apple-iphone-14-refurbished",
    name: "Apple iPhone 14 (восстановленный)",
    model: "iPhone 14",
    modelKey: "iphone-14",
    brand: "Apple",
    category: "smartphones",
    kind: "SMARTPHONE",
    condition: "REFURBISHED",
    installment: true,
    sales: 15,
    description:
      "Восстановленное устройство. Перечень выполненных работ и заменённых деталей указывается в документах к конкретному устройству.",
    equipment: "Смартфон, кабель, документация",
    specs: specs({
      Дисплей: [["Диагональ", "6,1″"], ["Тип", "Super Retina XDR OLED"]],
      Процессор: [["Чип", "Apple A15 Bionic (5‑ядерный GPU)"]],
      Камеры: [["Основная", "12 МП"], ["Сверхширокоугольная", "12 МП"], ["Фронтальная", "12 МП"]],
      "Память и связь": [["Разъём", "Lightning"]],
    }),
    variants: [{ color: "Полночь", hex: "#232A31", storage: 128, price: 239990, stock: 3 }],
  },
  // ─── Модели для б/у экземпляров (цены и наличие — у экземпляров) ───
  ...(
    [
      ["apple-iphone-13-used", "Apple iPhone 13", "iPhone 13", "iphone-13", "Apple", "A15 Bionic", "6,1″", "12 МП + 12 МП", "Lightning"],
      ["apple-iphone-12-used", "Apple iPhone 12", "iPhone 12", "iphone-12", "Apple", "A14 Bionic", "6,1″", "12 МП + 12 МП", "Lightning"],
      ["apple-iphone-14-pro-used", "Apple iPhone 14 Pro", "iPhone 14 Pro", "iphone-14-pro", "Apple", "A16 Bionic", "6,1″, ProMotion до 120 Гц", "48 МП + 12 МП + 12 МП (3×)", "Lightning"],
      ["apple-iphone-15-pro-used", "Apple iPhone 15 Pro", "iPhone 15 Pro", "iphone-15-pro", "Apple", "A17 Pro", "6,1″, ProMotion до 120 Гц", "48 МП + 12 МП + 12 МП (3×)", "USB‑C (USB 3)"],
      ["samsung-galaxy-s23-used", "Samsung Galaxy S23", "Galaxy S23", "galaxy-s23", "Samsung", "Snapdragon 8 Gen 2 for Galaxy", "6,1″, до 120 Гц", "50 МП + 12 МП + 10 МП (3×)", "USB‑C"],
    ] as const
  ).map(
    ([slug, name, model, key, brand, chip, display, cams, port]): P => ({
      slug,
      name,
      model,
      modelKey: key,
      brand,
      category: "smartphones",
      kind: "SMARTPHONE",
      condition: "USED",
      installment: true,
      description: `Б/у ${name}. Каждый экземпляр проходит проверку; состояние, ёмкость аккумулятора и результаты проверки указаны в карточке конкретного устройства.`,
      specs: specs({
        Дисплей: [["Диагональ", display]],
        Процессор: [["Чип", chip]],
        Камеры: [["Основные камеры", cams]],
        Разъём: [["Порт", port]],
      }),
    }),
  ),
  // ─── Планшеты ───
  {
    slug: "apple-ipad-air-11-m2",
    name: "Apple iPad Air 11″ (M2) Wi‑Fi",
    model: "iPad Air 11 M2",
    modelKey: "ipad-air-11-m2",
    brand: "Apple",
    category: "tablets",
    kind: "TABLET",
    installment: true,
    sales: 12,
    description: "Лёгкий планшет на чипе M2 с дисплеем Liquid Retina 11″ и поддержкой Apple Pencil Pro.",
    equipment: "Планшет, кабель USB‑C, документация",
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "11″"], ["Тип", "Liquid Retina"]],
      Процессор: [["Чип", "Apple M2"]],
      Камеры: [["Основная", "12 МП"], ["Фронтальная", "12 МП, горизонтальное расположение"]],
      "Память и связь": [["Встроенная память", "128 ГБ / 256 ГБ"], ["Связь", "Wi‑Fi 6E"], ["Разъём", "USB‑C"]],
      Безопасность: [["Биометрия", "Touch ID в верхней кнопке"]],
    }),
    variants: [
      { color: "Серый космос", hex: "#5E6066", storage: 128, price: 329990, stock: 3 },
      { color: "Голубой", hex: "#AFC3D6", storage: 256, price: 389990, stock: 1 },
    ],
  },
  {
    slug: "samsung-galaxy-tab-s9-fe",
    name: "Samsung Galaxy Tab S9 FE Wi‑Fi",
    model: "Galaxy Tab S9 FE",
    modelKey: "galaxy-tab-s9-fe",
    brand: "Samsung",
    category: "tablets",
    kind: "TABLET",
    sales: 9,
    description: "Планшет 10,9″ с S Pen в комплекте и защитой IP68.",
    equipment: "Планшет, S Pen, кабель USB‑C, документация",
    warranty: NEW_WARRANTY,
    specs: specs({
      Дисплей: [["Диагональ", "10,9″"], ["Частота обновления", "до 90 Гц"]],
      Процессор: [["Чипсет", "Exynos 1380"], ["Оперативная память", "6 ГБ"]],
      Аккумулятор: [["Ёмкость", "8000 мА·ч"]],
      Защита: [["Пыле- и влагозащита", "IP68"]],
    }),
    variants: [{ color: "Серый", hex: "#6D6F73", storage: 128, ram: 6, price: 189990, stock: 4 }],
  },
  // ─── Часы ───
  {
    slug: "apple-watch-series-10-46",
    name: "Apple Watch Series 10, 46 мм",
    model: "Watch Series 10",
    brand: "Apple",
    category: "smartwatches",
    kind: "WATCH",
    installment: true,
    sales: 8,
    description: "Самый тонкий Apple Watch с широкоугольным OLED-дисплеем.",
    equipment: "Часы, ремешок, зарядный кабель, документация",
    warranty: NEW_WARRANTY,
    specs: specs({ Основное: [["Размер корпуса", "46 мм"], ["Чип", "S10 SiP"], ["Дисплей", "Широкоугольный OLED, Always-On"]] }),
    variants: [{ color: "Чёрный глянцевый", hex: "#18191B", price: 249990, stock: 2 }],
  },
  {
    slug: "samsung-galaxy-watch7-44",
    name: "Samsung Galaxy Watch7, 44 мм",
    model: "Galaxy Watch7",
    brand: "Samsung",
    category: "smartwatches",
    kind: "WATCH",
    sales: 5,
    description: "Смарт-часы на Wear OS с двухчастотным GPS и процессором Exynos W1000.",
    equipment: "Часы, ремешок, зарядное устройство, документация",
    warranty: NEW_WARRANTY,
    specs: specs({ Основное: [["Размер корпуса", "44 мм"], ["Процессор", "Exynos W1000"], ["Система", "Wear OS"]] }),
    variants: [{ color: "Зелёный", hex: "#59665A", price: 149990, stock: 3 }],
  },
  // ─── Наушники и гарнитуры ───
  {
    slug: "apple-airpods-pro-2-usb-c",
    name: "Apple AirPods Pro 2 (USB‑C)",
    model: "AirPods Pro 2",
    brand: "Apple",
    category: "headphones",
    kind: "HEADPHONES",
    sales: 44,
    description: "Активное шумоподавление, адаптивный звук и зарядный футляр MagSafe с разъёмом USB‑C.",
    equipment: "Наушники, футляр MagSafe (USB‑C), амбушюры 4 размеров, кабель USB‑C",
    warranty: NEW_WARRANTY,
    specs: specs({ Основное: [["Чип", "Apple H2"], ["Шумоподавление", "Активное"], ["Разъём футляра", "USB‑C"]] }),
    variants: [{ color: "Белый", hex: "#F4F4F4", price: 119990, stock: 7 }],
  },
  {
    slug: "samsung-galaxy-buds3-pro",
    name: "Samsung Galaxy Buds3 Pro",
    model: "Galaxy Buds3 Pro",
    brand: "Samsung",
    category: "headphones",
    kind: "HEADPHONES",
    sales: 13,
    description: "Беспроводные наушники с активным шумоподавлением.",
    equipment: "Наушники, зарядный футляр, амбушюры, кабель USB‑C",
    warranty: NEW_WARRANTY,
    variants: [{ color: "Серебристый", hex: "#C9CACC", price: 99990, stock: 4 }],
  },
  {
    slug: "jabra-talk-30",
    name: "Jabra Talk 30",
    model: "Talk 30",
    brand: "Jabra",
    category: "headsets",
    kind: "ACCESSORY",
    sales: 3,
    description: "Моно-гарнитура Bluetooth для звонков.",
    variants: [{ color: "Чёрный", hex: "#1C1C1C", price: 19990, stock: 5 }],
    compat: ALL_PHONES,
  },
  // ─── Чехлы ───
  {
    slug: "apple-iphone-17-pro-clear-case-magsafe",
    name: "Apple Clear Case с MagSafe для iPhone 17 Pro",
    model: "Clear Case MagSafe iPhone 17 Pro",
    brand: "Apple",
    category: "cases",
    kind: "ACCESSORY",
    isNew: true,
    sales: 11,
    description: "Прозрачный чехол с поддержкой MagSafe.",
    variants: [{ color: "Прозрачный", hex: "#E9EEF2", price: 29990, stock: 6 }],
    compat: ["iphone-17-pro"],
  },
  {
    slug: "apple-iphone-16-silicone-case-magsafe",
    name: "Apple Silicone Case с MagSafe для iPhone 16",
    model: "Silicone Case MagSafe iPhone 16",
    brand: "Apple",
    category: "cases",
    kind: "ACCESSORY",
    sales: 22,
    description: "Силиконовый чехол с мягкой подкладкой и MagSafe.",
    variants: [
      { color: "Чёрный", hex: "#222222", price: 24990, stock: 5 },
      { color: "Голубой", hex: "#8FB4D9", price: 24990, stock: 3 },
    ],
    compat: ["iphone-16"],
  },
  {
    slug: "spigen-ultra-hybrid-iphone-15",
    name: "Spigen Ultra Hybrid для iPhone 15",
    model: "Ultra Hybrid iPhone 15",
    brand: "Spigen",
    category: "cases",
    kind: "ACCESSORY",
    sales: 17,
    description: "Прозрачный противоударный чехол с усиленными углами.",
    variants: [{ color: "Прозрачный", hex: "#EEF2F5", price: 9990, stock: 10 }],
    compat: ["iphone-15"],
  },
  {
    slug: "samsung-galaxy-s25-ultra-silicone-case",
    name: "Samsung Silicone Case для Galaxy S25 Ultra",
    model: "Silicone Case S25 Ultra",
    brand: "Samsung",
    category: "cases",
    kind: "ACCESSORY",
    sales: 9,
    description: "Оригинальный силиконовый чехол Samsung.",
    variants: [{ color: "Чёрный", hex: "#1E1E1E", price: 14990, stock: 4 }],
    compat: ["galaxy-s25-ultra"],
  },
  // ─── Защитные стёкла ───
  {
    slug: "spigen-glas-tr-ez-fit-iphone-16",
    name: "Spigen GLAS.tR EZ Fit для iPhone 16 / iPhone 15 (2 шт.)",
    model: "GLAS.tR EZ Fit iPhone 16",
    brand: "Spigen",
    category: "screen-protectors",
    kind: "ACCESSORY",
    sales: 26,
    description: "Защитное стекло с монтажной рамкой для ровной поклейки.",
    variants: [{ price: 11990, stock: 12 }],
    compat: ["iphone-16", "iphone-15"],
  },
  {
    slug: "spigen-glas-tr-galaxy-s25",
    name: "Spigen GLAS.tR для Galaxy S25 (2 шт.)",
    model: "GLAS.tR Galaxy S25",
    brand: "Spigen",
    category: "screen-protectors",
    kind: "ACCESSORY",
    sales: 6,
    description: "Защитное стекло с монтажной рамкой.",
    variants: [{ price: 10990, stock: 6 }],
    compat: ["galaxy-s25"],
  },
  // ─── Зарядные устройства ───
  {
    slug: "apple-20w-usb-c-power-adapter",
    name: "Apple 20W USB‑C Power Adapter",
    model: "20W USB‑C",
    brand: "Apple",
    category: "chargers",
    kind: "ACCESSORY",
    sales: 39,
    description: "Сетевой адаптер питания USB‑C мощностью 20 Вт.",
    specs: specs({ Основное: [["Мощность", "20 Вт"], ["Разъём", "USB‑C"]] }),
    variants: [{ color: "Белый", hex: "#F5F5F5", price: 12990, stock: 15 }],
    compat: [...USB_C_PHONES, ...LIGHTNING_PHONES],
  },
  {
    slug: "samsung-45w-power-adapter",
    name: "Samsung 45W Power Adapter",
    model: "45W PD",
    brand: "Samsung",
    category: "chargers",
    kind: "ACCESSORY",
    sales: 14,
    description: "Сетевое зарядное устройство Super Fast Charging 2.0 мощностью 45 Вт.",
    specs: specs({ Основное: [["Мощность", "45 Вт"], ["Разъём", "USB‑C"]] }),
    variants: [{ color: "Чёрный", hex: "#202020", price: 16990, stock: 6 }],
    compat: ["galaxy-s25-ultra", "galaxy-s25", "galaxy-a55", "galaxy-s23"],
  },
  // ─── Кабели ───
  {
    slug: "apple-usb-c-woven-cable-1m",
    name: "Apple USB‑C Woven Charge Cable (1 м)",
    model: "USB‑C Woven 1m",
    brand: "Apple",
    category: "cables",
    kind: "ACCESSORY",
    sales: 18,
    description: "Плетёный кабель USB‑C — USB‑C длиной 1 м, до 60 Вт.",
    specs: specs({ Основное: [["Разъёмы", "USB‑C — USB‑C"], ["Длина", "1 м"], ["Мощность", "до 60 Вт"]] }),
    variants: [{ color: "Белый", hex: "#F3F3F3", price: 9990, stock: 9 }],
    compat: USB_C_PHONES,
  },
  {
    slug: "apple-usb-c-lightning-cable-1m",
    name: "Apple USB‑C to Lightning Cable (1 м)",
    model: "USB‑C to Lightning 1m",
    brand: "Apple",
    category: "cables",
    kind: "ACCESSORY",
    sales: 12,
    description: "Кабель USB‑C — Lightning длиной 1 м.",
    variants: [{ color: "Белый", hex: "#F3F3F3", price: 9990, stock: 7 }],
    compat: LIGHTNING_PHONES,
  },
  {
    slug: "ugreen-usb-c-100w-2m",
    name: "UGREEN кабель USB‑C — USB‑C 100 Вт, 2 м",
    model: "USB‑C 100W 2m",
    brand: "UGREEN",
    category: "cables",
    kind: "ACCESSORY",
    sales: 8,
    description: "Кабель в оплётке с поддержкой мощности до 100 Вт.",
    variants: [{ color: "Серый", hex: "#7A7C80", price: 5990, stock: 14 }],
    compat: USB_C_PHONES,
  },
  // ─── Повербанки ───
  {
    slug: "anker-maggo-power-bank-10k",
    name: "Anker MagGo Power Bank 10 000 мА·ч",
    model: "MagGo 10K",
    brand: "Anker",
    category: "powerbanks",
    kind: "ACCESSORY",
    sales: 7,
    description: "Магнитный повербанк с поддержкой Qi2 и подставкой.",
    specs: specs({ Основное: [["Ёмкость", "10 000 мА·ч"], ["Беспроводная зарядка", "Qi2"]] }),
    variants: [{ color: "Чёрный", hex: "#25262A", price: 39990, stock: 3 }],
    compat: MAGSAFE,
  },
  {
    slug: "xiaomi-power-bank-20000",
    name: "Xiaomi Power Bank 20 000 мА·ч, 22,5 Вт",
    model: "Power Bank 20000",
    brand: "Xiaomi",
    category: "powerbanks",
    kind: "ACCESSORY",
    sales: 15,
    description: "Ёмкий внешний аккумулятор с быстрой зарядкой.",
    specs: specs({ Основное: [["Ёмкость", "20 000 мА·ч"], ["Мощность", "22,5 Вт"]] }),
    variants: [{ color: "Чёрный", hex: "#2A2A2A", price: 14990, stock: 8 }],
    compat: ALL_PHONES,
  },
  // ─── Другие аксессуары ───
  {
    slug: "apple-airtag",
    name: "Apple AirTag",
    model: "AirTag",
    brand: "Apple",
    category: "other-accessories",
    kind: "ACCESSORY",
    sales: 10,
    description: "Трекер для поиска вещей через приложение «Локатор».",
    variants: [{ color: "Белый", hex: "#F5F5F5", price: 17990, stock: 6 }],
    compat: MAGSAFE.concat([]),
  },
];

type U = {
  product: string;
  color: string;
  hex: string;
  storage: number;
  price: number;
  grade: UsedGrade;
  body: string;
  screen: string;
  battery: number | null;
  defects?: string;
  repairs?: string;
  equipment: string;
  serial: string;
  fails?: string[];
  notTested?: string[];
};

const USED: U[] = [
  { product: "apple-iphone-13-used", color: "Тёмная ночь", hex: "#1F252B", storage: 128, price: 189990, grade: "EXCELLENT", body: "Без видимых следов использования", screen: "Без царапин", battery: 91, equipment: "Смартфон, кабель USB‑C — Lightning", serial: "…4821" },
  { product: "apple-iphone-13-used", color: "Тёмная ночь", hex: "#1F252B", storage: 128, price: 164990, grade: "FAIR", body: "Сколы на углах, потёртости рамки", screen: "Мелкие царапины, не заметны при включённом экране", battery: 82, defects: "Скол на нижнем левом углу корпуса", equipment: "Только смартфон", serial: "…0937" },
  { product: "apple-iphone-13-used", color: "Голубой", hex: "#5C83A8", storage: 256, price: 209990, grade: "GOOD", body: "Лёгкие потёртости на рамке", screen: "Без царапин", battery: 87, repairs: "Аккумулятор заменён в сервисном центре (документ о замене не предоставлен)", equipment: "Смартфон, коробка", serial: "…7710" },
  { product: "apple-iphone-12-used", color: "Белый", hex: "#EFEFEC", storage: 64, price: 124990, grade: "GOOD", body: "Микроцарапины на задней панели", screen: "Без царапин", battery: 84, equipment: "Смартфон", serial: "…3359" },
  { product: "apple-iphone-14-pro-used", color: "Тёмно-фиолетовый", hex: "#4B4453", storage: 256, price: 309990, grade: "EXCELLENT", body: "Без видимых следов использования", screen: "Без царапин, с защитным стеклом", battery: 89, equipment: "Смартфон, коробка, кабель", serial: "…5502" },
  { product: "apple-iphone-15-pro-used", color: "Натуральный титан", hex: "#BDB6AC", storage: 128, price: 389990, grade: "EXCELLENT", body: "Без видимых следов использования", screen: "Без царапин", battery: 96, equipment: "Смартфон, коробка, кабель USB‑C", serial: "…1186" },
  { product: "apple-iphone-15-pro-used", color: "Синий титан", hex: "#3E4652", storage: 256, price: 399990, grade: "GOOD", body: "Потёртость на рамке у кнопки питания", screen: "Одна микроцарапина", battery: 92, equipment: "Смартфон", serial: "…6640", notTested: ["Беспроводная зарядка"] },
  { product: "samsung-galaxy-s23-used", color: "Кремовый", hex: "#EDE6D8", storage: 256, price: 219990, grade: "GOOD", body: "Лёгкие потёртости", screen: "Без царапин", battery: null, equipment: "Смартфон, кабель USB‑C", serial: "…2208", defects: "Ёмкость аккумулятора не измерялась (нет штатного инструмента)" },
];

const CHECKS = [
  ["display", "Дисплей и сенсор"],
  ["faceid", "Face ID / отпечаток пальца"],
  ["cameras", "Основная и фронтальная камеры"],
  ["speakers", "Динамики и микрофоны"],
  ["charging", "Зарядка (проводная/беспроводная)"],
  ["cellular", "Сотовая связь и SIM"],
  ["wifi_bt", "Wi‑Fi и Bluetooth"],
  ["buttons", "Кнопки и вибромотор"],
  ["sensors", "Датчики (гироскоп, приближение, освещённость)"],
  ["battery", "Аккумулятор"],
  ["icloud_frp", "Отвязка от аккаунтов (iCloud / Google FRP)"],
] as const;

async function main() {
  console.log("→ Роли и пользователи");
  for (const r of DEFAULT_ROLES) {
    await db.role.upsert({ where: { key: r.key }, create: { key: r.key, name: r.name, permissions: r.permissions }, update: { name: r.name, permissions: r.permissions } });
  }
  const roles = Object.fromEntries((await db.role.findMany()).map((r) => [r.key, r.id]));
  const pw = await hashPassword(process.env.SEED_PASSWORD || "Demo12345!");
  const users = [
    { email: "owner@basmart.kz", phone: "+77010000001", name: "Владелец магазина", role: "owner" },
    { email: "admin@basmart.kz", phone: "+77010000002", name: "Администратор", role: "admin" },
    { email: "staff@basmart.kz", phone: "+77010000003", name: "Сотрудник", role: "staff" },
    { email: "customer@basmart.kz", phone: "+77010000004", name: "Демо Покупатель", role: "customer" },
  ];
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      create: { email: u.email, phone: u.phone, name: u.name, passwordHash: pw, roleId: roles[u.role] },
      update: { roleId: roles[u.role] },
    });
  }

  console.log("→ Очистка каталога");
  await db.paymentEvent.deleteMany();
  await db.payment.deleteMany();
  await db.inventoryMovement.deleteMany();
  await db.installmentContract.deleteMany();
  await db.installmentApplication.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.favorite.deleteMany();
  await db.review.deleteMany();
  await db.productImage.deleteMany();
  await db.usedUnit.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.brand.deleteMany();

  console.log("→ Бренды и категории");
  for (const [i, name] of BRANDS.entries()) {
    await db.brand.create({ data: { name, slug: name.toLowerCase(), sortOrder: i } });
  }
  for (const [i, c] of CATEGORIES.entries()) {
    await db.category.create({ data: { slug: c.slug, nameRu: c.ru, nameKk: c.kk, group: c.group, sortOrder: i } });
  }
  const brands = Object.fromEntries((await db.brand.findMany()).map((b) => [b.name, b.id]));
  const cats = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));

  console.log("→ Товары");
  const now = Date.now();
  for (const [i, p] of PRODUCTS.entries()) {
    await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        model: p.model,
        modelKey: p.modelKey,
        brandId: brands[p.brand],
        categoryId: cats[p.category],
        kind: p.kind,
        condition: p.condition ?? "NEW",
        status: "PUBLISHED",
        isNewArrival: !!p.isNew,
        isFeatured: !!p.featured,
        installmentAvailable: !!p.installment,
        description: p.description,
        descriptionKk: p.descriptionKk,
        equipment: p.equipment,
        warranty: p.warranty,
        specs: p.specs ?? [],
        salesCount: p.sales ?? 0,
        publishedAt: new Date(now - i * 3600_000),
        variants: {
          create: (p.variants ?? []).map((v, j) => ({
            sku: `BA-${String(i + 1).padStart(4, "0")}-${j + 1}`,
            color: v.color,
            colorHex: v.hex,
            storageGb: v.storage,
            ramGb: v.ram,
            price: v.price,
            oldPrice: v.old,
            stock: v.stock,
          })),
        },
        compatibleWith: { create: (p.compat ?? []).map((modelKey) => ({ modelKey })) },
      },
    });
  }
  // Начальные складские движения — чтобы остатки имели историю
  for (const v of await db.productVariant.findMany()) {
    if (v.stock > 0) await db.inventoryMovement.create({ data: { variantId: v.id, delta: v.stock, reason: "receipt", comment: "Начальный остаток (демо)" } });
  }

  console.log("→ Б/у экземпляры и отчёты проверки");
  const inspector = await db.user.findUniqueOrThrow({ where: { email: "staff@basmart.kz" } });
  const products = Object.fromEntries((await db.product.findMany()).map((p) => [p.slug, p.id]));
  await db.$executeRawUnsafe(`SELECT setval('used_unit_code_seq', 1000, true)`);
  for (const [i, u] of USED.entries()) {
    const [{ n }] = await db.$queryRaw<{ n: bigint }[]>`SELECT nextval('used_unit_code_seq') AS n`;
    await db.usedUnit.create({
      data: {
        code: `BA-U-${n}`,
        productId: products[u.product],
        color: u.color,
        colorHex: u.hex,
        storageGb: u.storage,
        price: u.price,
        grade: u.grade,
        bodyCondition: u.body,
        screenCondition: u.screen,
        batteryHealth: u.battery,
        defects: u.defects,
        repairs: u.repairs,
        equipment: u.equipment,
        warranty: "Гарантия магазина 30 дней на скрытые дефекты, не указанные в карточке (демо-условие — задайте своё в админ-панели).",
        serialMasked: u.serial,
        status: "AVAILABLE",
        createdAt: new Date(now - i * 7200_000),
        inspection: {
          create: {
            inspectorId: inspector.id,
            summary: "Демонстрационный отчёт проверки.",
            checks: CHECKS.map(([key, label]) => ({
              key,
              label,
              result: u.notTested?.includes(label) || (key === "battery" && u.battery === null) ? "NOT_TESTED" : u.fails?.includes(label) ? "FAIL" : "PASS",
            })),
          },
        },
      },
    });
  }

  console.log("→ Доставка, промокоды, баннеры, настройки");
  const delivery = [
    { code: "pickup", nameRu: "Самовывоз из магазина", nameKk: "Дүкеннен алып кету", description: "Бесплатно. Заказ будет готов после подтверждения менеджером.", price: 0, freeFrom: null, needsAddress: false },
    { code: "courier_city", nameRu: "Курьер по городу", nameKk: "Қала бойынша курьер", description: "Доставка в пределах города.", price: 2000, freeFrom: 100000, needsAddress: true },
    { code: "kazakhstan", nameRu: "Доставка по Казахстану", nameKk: "Қазақстан бойынша жеткізу", description: "Отправка транспортной компанией. Срок зависит от города.", price: 3500, freeFrom: 300000, needsAddress: true },
  ];
  for (const [i, d] of delivery.entries()) {
    await db.deliveryOption.upsert({ where: { code: d.code }, create: { ...d, sortOrder: i }, update: { ...d, sortOrder: i } });
  }
  await db.promoCode.upsert({
    where: { code: "WELCOME5" },
    create: { code: "WELCOME5", type: "PERCENT", value: 5, minOrderTotal: 50000, maxUses: 500 },
    update: {},
  });
  await db.banner.deleteMany();
  await db.banner.createMany({
    data: [
      { placement: "hero", title: "Технологии, которые ближе", titleKk: "Жақын технологиялар", subtitle: "Новые и проверенные б/у смартфоны, аксессуары и халяльная рассрочка", subtitleKk: "Жаңа және тексерілген б/у смартфондар, аксессуарлар және халал бөліп төлеу", ctaLabel: "Выбрать смартфон", ctaHref: "/catalog/smartphones", theme: "dark", sortOrder: 0 },
      { placement: "hero", title: "iPhone 17 Pro", titleKk: "iPhone 17 Pro", subtitle: "A19 Pro и три камеры 48 МП", subtitleKk: "A19 Pro және үш 48 МП камера", ctaLabel: "Подробнее", ctaHref: "/product/apple-iphone-17-pro", theme: "brand", sortOrder: 1 },
      { placement: "hero", title: "Б/у с отчётом проверки", titleKk: "Тексеру есебі бар б/у", subtitle: "Каждый экземпляр — со своими фото, состоянием и результатами проверки", subtitleKk: "Әр дананың өз фотосы, күйі және тексеру нәтижелері бар", ctaLabel: "Смотреть б/у", ctaHref: "/used", theme: "light", sortOrder: 2 },
    ],
  });
  await db.setting.upsert({
    where: { key: "store" },
    create: {
      key: "store",
      value: {
        name: "B&A SMART",
        phone: "+7 (700) 000-00-00",
        whatsapp: "",
        email: "info@example.kz",
        city: "Алматы",
        address: "Адрес магазина — укажите в админ-панели",
        workHours: "Ежедневно 10:00–21:00",
        instagram: "",
        legalName: "",
        bin: "",
        cities: ["Алматы", "Астана", "Шымкент", "Караганда", "Актобе", "Атырау", "Павлодар", "Усть-Каменогорск", "Костанай", "Тараз"],
      },
    },
    update: {},
  });

  console.log("→ Демо-договор рассрочки для демо-покупателя");
  const customer = await db.user.findUniqueOrThrow({ where: { email: "customer@basmart.kz" } });
  const p16 = await db.product.findUniqueOrThrow({ where: { slug: "apple-iphone-16" }, include: { variants: { orderBy: { price: "asc" }, take: 1 } } });
  const app = await db.installmentApplication.create({
    data: {
      number: "R-DEMO-1",
      userId: customer.id,
      productId: p16.id,
      variantId: p16.variants[0].id,
      itemName: "Apple iPhone 16, 128 ГБ",
      price: p16.variants[0].price,
      totalPrice: p16.variants[0].price,
      downPayment: 129990,
      termMonths: 6,
      monthlyAmount: 50000,
      fullName: customer.name,
      phone: customer.phone!,
      city: "Алматы",
      consentAt: new Date(),
      status: "APPROVED",
      isDemo: true,
    },
  });
  const start = new Date();
  start.setDate(1);
  await db.installmentContract.create({
    data: {
      number: "D-DEMO-1",
      applicationId: app.id,
      userId: customer.id,
      totalPrice: app.totalPrice,
      downPayment: app.downPayment,
      termMonths: 6,
      startDate: start,
      status: "ACTIVE",
      isDemo: true,
      schedule: {
        create: Array.from({ length: 6 }, (_, i) => {
          const d = new Date(start);
          d.setMonth(d.getMonth() + i + 1);
          return { seq: i + 1, dueDate: d, amount: 50000, status: i === 0 ? ("PAID" as const) : ("PENDING" as const), paidAt: i === 0 ? new Date() : null };
        }),
      },
    },
  });

  const counts = {
    products: await db.product.count(),
    variants: await db.productVariant.count(),
    usedUnits: await db.usedUnit.count(),
    users: await db.user.count(),
  };
  console.log("✓ Готово", counts);
  console.log(`Учётные записи (пароль: ${process.env.SEED_PASSWORD ? "из SEED_PASSWORD" : "Demo12345!"}): owner@basmart.kz, admin@basmart.kz, staff@basmart.kz, customer@basmart.kz`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
