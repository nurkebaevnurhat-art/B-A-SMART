import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && <Link href={back.href} className="text-sm text-muted hover:text-ink">← {back.label}</Link>}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, children, actions, className = "" }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 md:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-sans text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="p-6 text-center text-muted">Нет данных</p>}
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const inner = (
    <>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-ink">{inner}</Link>
  ) : (
    <div className="rounded-2xl border border-line bg-white p-5">{inner}</div>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink";

export function F({ label, name, defaultValue, type = "text", required, placeholder, hint, className = "", step, min }: { label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string; hint?: string; className?: string; step?: string; min?: number }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-graphite">{label}{required && <span className="text-accent"> *</span>}</span>
      <input name={name} type={type} defaultValue={defaultValue ?? undefined} required={required} placeholder={placeholder} step={step} min={min} className={inputCls} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function FArea({ label, name, defaultValue, rows = 3, className = "", hint }: { label: string; name: string; defaultValue?: string | null; rows?: number; className?: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-graphite">{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? undefined} rows={rows} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink" />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function FSelect({ label, name, defaultValue, options, className = "" }: { label: string; name: string; defaultValue?: string | null; options: { value: string; label: string }[]; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-graphite">{label}</span>
      <select name={name} defaultValue={defaultValue ?? undefined} className={inputCls}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function FCheck({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--c-ink)]" />
      {label}
    </label>
  );
}

export function SearchBar({ placeholder, defaultValue, children }: { placeholder: string; defaultValue?: string; children?: ReactNode }) {
  return (
    <form className="mb-5 flex flex-wrap gap-2">
      <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="h-10 min-w-[220px] flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-ink" />
      {children}
      <button className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-white">Найти</button>
    </form>
  );
}
