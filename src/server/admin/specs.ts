import type { SpecGroup } from "@/server/services/products";

/** Характеристики в текстовом виде: одна строка «Группа | Параметр | Значение» */
export function specsToText(groups: SpecGroup[]): string {
  return groups.flatMap((g) => g.items.map((i) => `${g.group} | ${i.label} | ${i.value}`)).join("\n");
}

export function textToSpecs(text: string): SpecGroup[] {
  const map = new Map<string, { label: string; value: string }[]>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split("|").map((p) => p.trim());
    let group = "Основное", label: string, value: string;
    if (parts.length >= 3) [group, label, value] = [parts[0] || "Основное", parts[1], parts.slice(2).join(" | ")];
    else if (parts.length === 2) [label, value] = parts;
    else continue;
    if (!label || !value) continue;
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push({ label, value });
  }
  return [...map].map(([group, items]) => ({ group, items }));
}
