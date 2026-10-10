import { formatPrice } from "@/lib/format";

export function Price({ value, old, from, size = "md", className = "" }: { value: number; old?: number | null; from?: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const s = { sm: "text-[15px]", md: "text-lg", lg: "text-2xl", xl: "text-3xl md:text-4xl" }[size];
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={`${s} font-semibold tracking-tight text-ink`}>
        {from && <span className="mr-1 text-[0.8em] font-normal text-muted">{from}</span>}
        {formatPrice(value)}
      </span>
      {old && old > value && <s className="text-sm text-muted">{formatPrice(old)}</s>}
    </span>
  );
}
