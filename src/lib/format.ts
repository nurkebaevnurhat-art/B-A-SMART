const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** 449990 → "449 990 ₸" */
export function formatPrice(value: number): string {
  return `${nf.format(Math.round(value)).replace(/ /g, " ")} ₸`;
}

export function formatDate(d: Date | string, locale = "ru"): string {
  return new Date(d).toLocaleDateString(locale === "kk" ? "kk-KZ" : "ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

export function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}

/** Нормализация казахстанского номера в формат +7XXXXXXXXXX */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let d = digits;
  if (d.length === 11 && (d.startsWith("8") || d.startsWith("7"))) d = d.slice(1);
  if (d.length !== 10) return null;
  return `+7${d}`;
}

export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return p;
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
}

export function slugify(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "",
    ы: "y", ь: "", э: "e", ю: "yu", я: "ya", ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
  };
  return s
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function storageLabel(gb?: number | null): string | null {
  if (!gb) return null;
  return gb >= 1024 ? `${gb / 1024} ТБ` : `${gb} ГБ`;
}
