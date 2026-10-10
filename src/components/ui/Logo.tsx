import { brand } from "@/config/brand";

/**
 * Текстовый логотип B&A SMART. Цвета берутся из brand.ts.
 * variant="full" — основной; "compact" — круглый знак для мобильных и иконок.
 * onDark — светлая версия для тёмного фона.
 */
export function Logo({ variant = "full", onDark = false, className = "" }: { variant?: "full" | "compact"; onDark?: boolean; className?: string }) {
  const ink = onDark ? "#FFFFFF" : brand.colors.primary;
  const amp = brand.colors.accent;
  if (variant === "compact") {
    return (
      <svg viewBox="0 0 64 64" className={className} role="img" aria-label={brand.name}>
        <circle cx="32" cy="32" r="29" fill={onDark ? "transparent" : "#fff"} stroke={amp} strokeWidth="4" />
        <text x="32" y="38" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="20" fill={ink} letterSpacing="-0.5">
          B<tspan fill={amp}>&amp;</tspan>A
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 172 40" className={className} role="img" aria-label={brand.name}>
      <text x="0" y="30" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="31" fill={ink} letterSpacing="-0.5">
        B<tspan fill={amp}>&amp;</tspan>A
      </text>
      <text x="76" y="29" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="24" fill={ink} letterSpacing="2.6">
        smart
      </text>
    </svg>
  );
}
