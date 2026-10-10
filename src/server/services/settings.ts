import { z } from "zod";
import { db } from "@/lib/db";

export const storeSettingsSchema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().max(40),
  whatsapp: z.string().max(40).optional().default(""),
  email: z.string().max(120).optional().default(""),
  city: z.string().max(80),
  address: z.string().max(200),
  workHours: z.string().max(120),
  instagram: z.string().max(200).optional().default(""),
  legalName: z.string().max(200).optional().default(""),
  bin: z.string().max(20).optional().default(""),
  cities: z.array(z.string().min(1).max(60)).max(50),
});

export const topbarSchema = z.object({
  items: z.array(z.object({ ru: z.string().min(1).max(120), kk: z.string().max(120).optional().default(""), href: z.string().max(200).optional().default("") })).max(6),
});

export const gradeCriteriaSchema = z.object({
  EXCELLENT: z.object({ ru: z.string().max(600), kk: z.string().max(600) }),
  GOOD: z.object({ ru: z.string().max(600), kk: z.string().max(600) }),
  FAIR: z.object({ ru: z.string().max(600), kk: z.string().max(600) }),
});

export const installmentSettingsSchema = z.object({
  enabled: z.boolean(),
  /** Пока модель сделки не проверена специалистом по исламским финансам и юристом — true */
  isDemo: z.boolean(),
  /** Заключение договоров — отключено до юридической проверки */
  contractsEnabled: z.boolean(),
  terms: z.array(z.number().int().min(1).max(36)).min(1).max(12),
  minDownPercent: z.number().min(0).max(90),
  /** Фиксированная наценка продавца по сроку (в %), согласуется до сделки и не меняется. По умолчанию 0. */
  markupPercentByTerm: z.record(z.string(), z.number().min(0).max(100)),
  minPrice: z.number().int().min(0),
  maxPrice: z.number().int().min(0),
});

export const checkoutSettingsSchema = z.object({
  reservationMinutes: z.number().int().min(5).max(120),
  cashOnDeliveryEnabled: z.boolean(),
  onlinePaymentEnabled: z.boolean(),
});

const DEFAULTS = {
  store: {
    name: "B&A SMART",
    phone: "",
    whatsapp: "",
    email: "",
    city: "Алматы",
    address: "",
    workHours: "",
    instagram: "",
    legalName: "",
    bin: "",
    cities: ["Алматы", "Астана", "Шымкент", "Караганда", "Актобе", "Атырау", "Павлодар", "Усть-Каменогорск", "Костанай", "Тараз"],
  } as z.infer<typeof storeSettingsSchema>,
  topbar: { items: [] } as z.infer<typeof topbarSchema>,
  grades: {
    EXCELLENT: {
      ru: "Без видимых следов использования на расстоянии вытянутой руки. Экран без царапин. Все функции работают.",
      kk: "Қол созым қашықтықта пайдалану іздері көрінбейді. Экранда сызат жоқ. Барлық функциялар жұмыс істейді.",
    },
    GOOD: {
      ru: "Лёгкие потёртости или микроцарапины на корпусе, экран без заметных дефектов. Все функции работают.",
      kk: "Корпуста жеңіл қажалу немесе микросызаттар бар, экранда елеулі ақау жоқ. Барлық функциялар жұмыс істейді.",
    },
    FAIR: {
      ru: "Заметные следы использования: царапины, сколы. Известные дефекты указаны в карточке экземпляра.",
      kk: "Пайдаланудың айқын іздері: сызаттар, жарықшақтар. Белгілі ақаулар данасының картасында көрсетілген.",
    },
  } as z.infer<typeof gradeCriteriaSchema>,
  installment: {
    enabled: true,
    isDemo: true,
    contractsEnabled: false,
    terms: [3, 6, 12],
    minDownPercent: 0,
    markupPercentByTerm: { "3": 0, "6": 0, "12": 0 },
    minPrice: 30000,
    maxPrice: 2000000,
  } as z.infer<typeof installmentSettingsSchema>,
  checkout: {
    reservationMinutes: 15,
    cashOnDeliveryEnabled: true,
    onlinePaymentEnabled: true,
  } as z.infer<typeof checkoutSettingsSchema>,
};

export type SettingsMap = typeof DEFAULTS;
export type SettingKey = keyof SettingsMap;

export const SETTING_SCHEMAS = {
  store: storeSettingsSchema,
  topbar: topbarSchema,
  grades: gradeCriteriaSchema,
  installment: installmentSettingsSchema,
  checkout: checkoutSettingsSchema,
} as const;

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return DEFAULTS[key];
  const parsed = SETTING_SCHEMAS[key].safeParse({ ...(DEFAULTS[key] as object), ...(row.value as object) });
  return (parsed.success ? parsed.data : DEFAULTS[key]) as SettingsMap[K];
}

export async function setSetting<K extends SettingKey>(key: K, value: unknown): Promise<SettingsMap[K]> {
  const data = SETTING_SCHEMAS[key].parse(value) as SettingsMap[K];
  await db.setting.upsert({ where: { key }, create: { key, value: data as object }, update: { value: data as object } });
  return data;
}

export function defaultSetting<K extends SettingKey>(key: K): SettingsMap[K] {
  return DEFAULTS[key];
}
