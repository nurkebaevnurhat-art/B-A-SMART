import { Icon } from "../ui/Icon";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it) => (
        <details key={it.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium marker:hidden">
            {it.q}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line transition-transform group-open:rotate-45">
              <Icon name="plus" size={16} />
            </span>
          </summary>
          <p className="max-w-3xl pb-6 leading-relaxed text-graphite">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
