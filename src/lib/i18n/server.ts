import { cookies } from "next/headers";
import { dictionaries, type Locale } from "./dict";

export const LOCALE_COOKIE = "lang";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "kk" ? "kk" : "ru";
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

/** Выбор локализованного поля: nameKk / nameRu */
export function pick<T extends string | null | undefined>(locale: Locale, ru: T, kk?: string | null): string {
  return (locale === "kk" && kk ? kk : ru) ?? "";
}
