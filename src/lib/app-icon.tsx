import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

/** Иконка приложения (PWA / iOS / будущее мобильное приложение): знак B&A на фирменном фоне */
export function appIcon(size: number, maskable = false) {
  const pad = maskable ? size * 0.18 : size * 0.06;
  const inner = size - pad * 2;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: maskable ? brand.colors.primary : "transparent" }}>
        <div
          style={{
            width: inner,
            height: inner,
            borderRadius: inner,
            background: "#fff",
            border: `${Math.max(2, inner * 0.06)}px solid ${brand.colors.accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: inner * 0.34,
            fontWeight: 800,
            color: brand.colors.primary,
            letterSpacing: -inner * 0.01,
          }}
        >
          B<span style={{ color: brand.colors.accent }}>&amp;</span>A
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
