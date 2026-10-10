"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { storageLabel } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";

export type Facets = {
  brands: { slug: string; name: string }[];
  storages: number[];
  colors: { name: string; hex: string | null }[];
  price: { min: number; max: number } | null;
  compat: { key: string; label: string }[];
};

type Props = {
  facets: Facets;
  total: number;
  hideCondition?: boolean;
  showGrade?: boolean;
  showCompat?: boolean;
  mode: "button" | "sidebar";
};

function useParamsState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  // Оптимистичное состояние: фильтр отмечается сразу, не дожидаясь загрузки страницы
  const [optimistic, setOptimistic] = useState<URLSearchParams | null>(null);
  useEffect(() => setOptimistic(null), [sp]);
  const cur = optimistic ?? sp;
  const get = (k: string) => cur.get(k) ?? "";
  const list = (k: string) => (cur.get(k) ?? "").split(",").filter(Boolean);
  const update = (patch: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(cur.toString());
    for (const [k, v] of Object.entries(patch)) {
      const val = Array.isArray(v) ? v.join(",") : v;
      if (!val) next.delete(k);
      else next.set(k, val);
    }
    next.delete("page");
    setOptimistic(next);
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const toggle = (k: string, v: string) => {
    const cur = list(k);
    update({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const reset = () => {
    const keep = new URLSearchParams();
    if (sp.get("q")) keep.set("q", sp.get("q")!);
    if (sp.get("sort")) keep.set("sort", sp.get("sort")!);
    start(() => router.push(`${pathname}${keep.size ? `?${keep}` : ""}`, { scroll: false }));
  };
  return { get, list, update, toggle, reset, pending, sp };
}

export function SortSelect() {
  const { t } = useI18n();
  const { get, update } = useParamsState();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">{t.catalog.sort}:</span>
      <select
        value={get("sort") || "new"}
        onChange={(e) => update({ sort: e.target.value === "new" ? null : e.target.value })}
        className="h-10 cursor-pointer rounded-full border border-line bg-white pl-4 pr-8 text-sm font-medium outline-none hover:border-ink"
        aria-label={t.catalog.sort}
      >
        <option value="new">{t.catalog.sortNew}</option>
        <option value="price_asc">{t.catalog.sortPriceAsc}</option>
        <option value="price_desc">{t.catalog.sortPriceDesc}</option>
        <option value="popular">{t.catalog.sortPopular}</option>
      </select>
    </label>
  );
}

export function CatalogFilters(props: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const state = useParamsState();
  const activeCount = ["brand", "condition", "grade", "storage", "color", "priceMin", "priceMax", "inStock", "installment", "compat"].filter((k) => state.get(k)).length;

  if (props.mode === "sidebar") {
    return (
      <aside aria-label={t.catalog.filters}>
        <FilterBody {...props} state={state} activeCount={activeCount} />
      </aside>
    );
  }
  return (
    <>
      <div className="flex items-center gap-3 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Icon name="filter" size={18} /> {t.catalog.filters}
          {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-white">{activeCount}</span>}
        </Button>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} side="left" title={t.catalog.filters}>
        <div className="px-6 pb-28 pt-4">
          <FilterBody {...props} state={state} activeCount={activeCount} />
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-line bg-white p-4">
          <Button className="w-full" size="lg" onClick={() => setOpen(false)} loading={state.pending}>
            {t.catalog.apply} ({props.total})
          </Button>
        </div>
      </Drawer>
    </>
  );
}

function FilterBody({ facets, hideCondition, showGrade, showCompat, state, activeCount }: Props & { state: ReturnType<typeof useParamsState>; activeCount: number }) {
  const { t } = useI18n();
  const { get, list, toggle, update, reset, pending } = state;
  const [pmin, setPmin] = useState(get("priceMin"));
  const [pmax, setPmax] = useState(get("priceMax"));
  useEffect(() => {
    setPmin(get("priceMin"));
    setPmax(get("priceMax"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sp]);

  const conditions = list("condition");
  const showGradeNow = showGrade || conditions.includes("USED");

  return (
    <div className={`space-y-8 transition-opacity ${pending ? "opacity-60" : ""}`}>
      {activeCount > 0 && (
        <button onClick={reset} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <Icon name="close" size={16} /> {t.catalog.reset}
        </button>
      )}

      {!hideCondition && (
        <Group title={t.catalog.condition}>
          {(
            [
              ["NEW", t.catalog.condNew],
              ["USED", t.catalog.condUsed],
              ["REFURBISHED", t.catalog.condRefurb],
            ] as const
          ).map(([v, l]) => (
            <Check key={v} label={l} checked={conditions.includes(v)} onChange={() => toggle("condition", v)} />
          ))}
        </Group>
      )}

      {showGradeNow && (
        <Group title={t.catalog.grade}>
          {(["EXCELLENT", "GOOD", "FAIR"] as const).map((g) => (
            <Check key={g} label={t.grades[g]} checked={list("grade").includes(g)} onChange={() => toggle("grade", g)} />
          ))}
        </Group>
      )}

      {facets.brands.length > 0 && (
        <Group title={t.catalog.brand}>
          {facets.brands.map((b) => (
            <Check key={b.slug} label={b.name} checked={list("brand").includes(b.slug)} onChange={() => toggle("brand", b.slug)} />
          ))}
        </Group>
      )}

      <Group title={t.catalog.price}>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ priceMin: pmin.replace(/\D/g, "") || null, priceMax: pmax.replace(/\D/g, "") || null });
          }}
        >
          <input
            inputMode="numeric"
            value={pmin}
            onChange={(e) => setPmin(e.target.value)}
            onBlur={() => update({ priceMin: pmin.replace(/\D/g, "") || null })}
            placeholder={facets.price ? facets.price.min.toLocaleString("ru-RU") : t.catalog.priceFrom}
            className="h-11 w-full min-w-0 rounded-xl border border-line px-3 text-sm outline-none focus:border-ink"
            aria-label={`${t.catalog.price} ${t.catalog.priceFrom}`}
          />
          <span className="text-muted">—</span>
          <input
            inputMode="numeric"
            value={pmax}
            onChange={(e) => setPmax(e.target.value)}
            onBlur={() => update({ priceMax: pmax.replace(/\D/g, "") || null })}
            placeholder={facets.price ? facets.price.max.toLocaleString("ru-RU") : t.catalog.priceTo}
            className="h-11 w-full min-w-0 rounded-xl border border-line px-3 text-sm outline-none focus:border-ink"
            aria-label={`${t.catalog.price} ${t.catalog.priceTo}`}
          />
          <button type="submit" className="sr-only">OK</button>
        </form>
      </Group>

      {facets.storages.length > 0 && (
        <Group title={t.catalog.storage}>
          <div className="flex flex-wrap gap-2">
            {facets.storages.map((s) => {
              const on = list("storage").includes(String(s));
              return (
                <button
                  key={s}
                  onClick={() => toggle("storage", String(s))}
                  className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${on ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
                  aria-pressed={on}
                >
                  {storageLabel(s)}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {facets.colors.length > 0 && (
        <Group title={t.catalog.color}>
          {facets.colors.slice(0, 14).map((c) => (
            <Check
              key={c.name}
              label={
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: c.hex ?? "#eee" }} />
                  {c.name}
                </span>
              }
              checked={list("color").includes(c.name)}
              onChange={() => toggle("color", c.name)}
            />
          ))}
        </Group>
      )}

      {showCompat && facets.compat.length > 0 && (
        <Group title={t.catalog.compat}>
          <select
            value={get("compat")}
            onChange={(e) => update({ compat: e.target.value || null })}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-ink"
            aria-label={t.catalog.compat}
          >
            <option value="">{t.common.all}</option>
            {facets.compat.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </Group>
      )}

      <div className="space-y-3 border-t border-line pt-6">
        <Check label={t.catalog.availability} checked={get("inStock") === "1"} onChange={() => update({ inStock: get("inStock") === "1" ? null : "1" })} />
        <Check label={t.catalog.installmentOnly} checked={get("installment") === "1"} onChange={() => update({ installment: get("installment") === "1" ? null : "1" })} />
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</legend>
      <div className="space-y-2.5">{children}</div>
    </fieldset>
  );
}

function Check({ label, checked, onChange }: { label: React.ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[15px]">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-[18px] w-[18px] cursor-pointer accent-[var(--c-ink)]" />
      {label}
    </label>
  );
}
