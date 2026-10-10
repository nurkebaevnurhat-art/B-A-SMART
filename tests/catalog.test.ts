import { describe, expect, it } from "vitest";
import { catalogFacets, listCatalog, parseCatalogQuery, searchSuggestions } from "@/server/services/catalog";
import { getCompatibleAccessories } from "@/server/services/products";

describe("Каталог", () => {
  it("фильтр по бренду и состоянию", async () => {
    const r = await listCatalog(parseCatalogQuery({ category: "smartphones", brand: "samsung", condition: "NEW" }));
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((i) => i.brand === "Samsung" && i.condition === "NEW")).toBe(true);
  });

  it("б/у — отдельная карточка на каждый экземпляр", async () => {
    const r = await listCatalog(parseCatalogQuery({ condition: "USED", perPage: "60" }));
    expect(r.items.every((i) => i.type === "unit" && i.code?.startsWith("BA-U-"))).toBe(true);
    const iphone13 = r.items.filter((i) => i.name === "Apple iPhone 13");
    expect(iphone13.length).toBeGreaterThanOrEqual(2); // два одинаковых телефона — два экземпляра
  });

  it("сортировка по цене и диапазон цены", async () => {
    const r = await listCatalog(parseCatalogQuery({ category: "smartphones", sort: "price_asc", priceMin: "150000", priceMax: "500000", perPage: "60" }));
    const prices = r.items.map((i) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices.every((p) => p >= 150000 && p <= 500000)).toBe(true);
  });

  it("пагинация и количество", async () => {
    const all = await listCatalog(parseCatalogQuery({ perPage: "5" }));
    expect(all.items).toHaveLength(5);
    expect(all.pages).toBe(Math.ceil(all.total / 5));
    const p2 = await listCatalog(parseCatalogQuery({ perPage: "5", page: "2" }));
    expect(p2.items.map((i) => i.id)).not.toEqual(all.items.map((i) => i.id));
  });

  it("поиск по названию и модели", async () => {
    const r = await listCatalog(parseCatalogQuery({ q: "galaxy s25" }));
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((i) => /galaxy s25/i.test(i.name))).toBe(true);
    const s = await searchSuggestions("airpods");
    expect(s[0]?.name).toMatch(/AirPods/);
  });

  it("совместимость аксессуаров берётся из данных каталога", async () => {
    const acc = await getCompatibleAccessories("iphone-16");
    expect(acc.length).toBeGreaterThan(0);
    expect(acc.some((a) => /iPhone 16/.test(a.name))).toBe(true);
    expect(acc.some((a) => /Galaxy S25 Ultra/.test(a.name))).toBe(false);
    const filtered = await listCatalog(parseCatalogQuery({ category: "accessories", compat: "galaxy-s25-ultra" }));
    expect(filtered.items.some((i) => /iPhone 16/.test(i.name))).toBe(false);
  });

  it("фасеты фильтров", async () => {
    const f = await catalogFacets(parseCatalogQuery({ category: "smartphones" }));
    expect(f.brands.map((b) => b.slug)).toContain("apple");
    expect(f.storages).toContain(128);
    expect(f.price!.min).toBeLessThan(f.price!.max);
  });

  it("некорректные параметры не ломают каталог", () => {
    const q = parseCatalogQuery({ sort: "hack", page: "-5", perPage: "100000" });
    expect(q.page).toBe(1);
    expect(q.perPage).toBe(24);
  });
});
