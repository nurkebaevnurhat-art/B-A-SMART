/**
 * Централизованные настройки фирменного стиля.
 * Чтобы сменить название, цвета или логотип — правьте только этот файл
 * (и при необходимости SVG-компонент Logo).
 */
export const brand = {
  name: "B&A SMART",
  shortName: "B&A",
  wordmark: { primary: "B&A", secondary: "smart" },
  tagline: "Смартфоны и аксессуары",
  colors: {
    // Цвета взяты из логотипа
    primary: "#274E65", // глубокий сине-петролевый
    primaryDark: "#1A3646",
    accent: "#F07F04", // фирменный оранжевый
    accentDark: "#D06B00",
    ink: "#111418",
    graphite: "#3A4048",
    muted: "#6B7380",
    line: "#E6E8EB",
    surface: "#F5F6F7",
    bg: "#FFFFFF",
    success: "#1F8A4C",
    danger: "#C9302C",
  },
  currency: "KZT",
  locales: ["ru", "kk"] as const,
  defaultLocale: "ru" as const,
} as const;

export type BrandColors = typeof brand.colors;

export function brandCssVariables(): string {
  const map: Record<string, string> = {
    "--c-primary": brand.colors.primary,
    "--c-primary-dark": brand.colors.primaryDark,
    "--c-accent": brand.colors.accent,
    "--c-accent-dark": brand.colors.accentDark,
    "--c-ink": brand.colors.ink,
    "--c-graphite": brand.colors.graphite,
    "--c-muted": brand.colors.muted,
    "--c-line": brand.colors.line,
    "--c-surface": brand.colors.surface,
    "--c-bg": brand.colors.bg,
    "--c-success": brand.colors.success,
    "--c-danger": brand.colors.danger,
  };
  return `:root{${Object.entries(map).map(([k, v]) => `${k}:${v}`).join(";")}}`;
}
