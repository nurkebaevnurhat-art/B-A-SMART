import type { Config } from "tailwindcss";

// Дизайн-токены. Сами цвета задаются в src/config/brand.ts через CSS-переменные.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", md: "1.5rem", xl: "2rem" }, screens: { "2xl": "1360px" } },
    extend: {
      colors: {
        primary: { DEFAULT: "var(--c-primary)", dark: "var(--c-primary-dark)" },
        accent: { DEFAULT: "var(--c-accent)", dark: "var(--c-accent-dark)" },
        ink: "var(--c-ink)",
        graphite: "var(--c-graphite)",
        muted: "var(--c-muted)",
        line: "var(--c-line)",
        surface: "var(--c-surface)",
        success: "var(--c-success)",
        danger: "var(--c-danger)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "14px", "2xl": "20px", "3xl": "28px" },
      boxShadow: {
        soft: "0 1px 2px rgba(17,20,24,.04), 0 8px 24px rgba(17,20,24,.06)",
        lift: "0 2px 6px rgba(17,20,24,.06), 0 18px 40px rgba(17,20,24,.10)",
      },
      transitionTimingFunction: { smooth: "cubic-bezier(.22,.61,.36,1)" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.22,.61,.36,1) both",
        "slide-in": "slide-in .35s cubic-bezier(.22,.61,.36,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
