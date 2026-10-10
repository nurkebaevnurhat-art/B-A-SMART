/**
 * Векторная иллюстрация устройства — используется, пока для товара не загружены фотографии.
 * Это НЕ фотография товара; на странице товара рядом выводится соответствующая подпись.
 */
type ArtKind = "phone" | "tablet" | "watch" | "earbuds" | "case" | "glass" | "charger" | "cable" | "powerbank" | "headset" | "tag";

export function artKindFor(kind: string, category?: string | null): ArtKind {
  switch (category) {
    case "cases": return "case";
    case "screen-protectors": return "glass";
    case "chargers": return "charger";
    case "cables": return "cable";
    case "powerbanks": return "powerbank";
    case "headsets": return "headset";
    case "other-accessories": return "tag";
    case "headphones": return "earbuds";
    case "smartwatches": return "watch";
    case "tablets": return "tablet";
  }
  if (kind === "TABLET") return "tablet";
  if (kind === "WATCH") return "watch";
  if (kind === "HEADPHONES") return "earbuds";
  if (kind === "ACCESSORY") return "case";
  return "phone";
}

function shade(hex: string, amt: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function Lens({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 2.5} fill="#1b1d21" opacity=".9" />
      <circle cx={x} cy={y} r={r} fill="#0b0c0e" />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.28} fill="#4a5568" opacity=".8" />
    </g>
  );
}

function Camera({ brand, x, y, body }: { brand: string; x: number; y: number; body: string }) {
  const b = brand.toLowerCase();
  if (b.includes("samsung")) return <g><Lens x={x + 10} y={y + 10} /><Lens x={x + 10} y={y + 32} /><Lens x={x + 10} y={y + 54} /></g>;
  if (b.includes("google")) return <g><rect x={x - 8} y={y + 6} width={118} height={30} rx={15} fill={shade(body, -0.25)} /><Lens x={x + 18} y={y + 21} r={6} /><Lens x={x + 40} y={y + 21} r={6} /></g>;
  if (b.includes("xiaomi")) return <g><rect x={x} y={y} width={52} height={52} rx={12} fill={shade(body, -0.12)} /><Lens x={x + 15} y={y + 15} r={6} /><Lens x={x + 37} y={y + 15} r={6} /><Lens x={x + 15} y={y + 37} r={6} /></g>;
  return (
    <g>
      <rect x={x} y={y} width={50} height={50} rx={13} fill={shade(body, 0.08)} stroke={shade(body, -0.15)} strokeWidth="1" />
      <Lens x={x + 14} y={y + 14} r={6.5} /><Lens x={x + 14} y={y + 36} r={6.5} /><Lens x={x + 36} y={y + 25} r={6.5} />
    </g>
  );
}

export function ProductArt({ kind, category, color, brand = "", className = "" }: { kind: string; category?: string | null; color?: string | null; brand?: string; className?: string }) {
  const body = color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#C9CDD3";
  const art = artKindFor(kind, category);
  const hi = shade(body, 0.14);
  const lo = shade(body, -0.12);
  const id = `g${body.slice(1)}${art}`;
  return (
    <svg viewBox="0 0 300 300" className={className} role="img" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c3e50" />
          <stop offset=".55" stopColor="#274E65" />
          <stop offset="1" stopColor="#F07F04" stopOpacity=".85" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="272" rx="90" ry="8" fill="#000" opacity=".06" />
      {art === "phone" && (
        <g>
          <rect x="70" y="40" width="120" height="226" rx="20" fill="#14161a" transform="rotate(-8 130 153)" />
          <rect x="76" y="46" width="108" height="214" rx="16" fill="url(#scr)" transform="rotate(-8 130 153)" />
          <rect x="120" y="34" width="122" height="230" rx="21" fill={`url(#${id})`} stroke={lo} />
          <Camera brand={brand} x={136} y={50} body={body} />
          <circle cx="181" cy="185" r="9" fill={shade(body, -0.06)} opacity=".6" />
        </g>
      )}
      {art === "tablet" && (
        <g>
          <rect x="45" y="50" width="210" height="200" rx="18" fill="#15171b" />
          <rect x="54" y="59" width="192" height="182" rx="10" fill="url(#scr)" />
          <rect x="45" y="50" width="210" height="200" rx="18" fill="none" stroke={body} strokeWidth="4" />
        </g>
      )}
      {art === "watch" && (
        <g>
          <rect x="120" y="20" width="60" height="70" rx="12" fill={lo} />
          <rect x="120" y="210" width="60" height="70" rx="12" fill={lo} />
          <rect x="95" y="80" width="110" height="140" rx="30" fill={`url(#${id})`} />
          <rect x="104" y="90" width="92" height="120" rx="22" fill="#0d0f12" />
          <text x="150" y="157" textAnchor="middle" fill="#fff" fontFamily="Arial" fontSize="26" fontWeight="600">10:09</text>
          <rect x="203" y="125" width="8" height="24" rx="4" fill={lo} />
        </g>
      )}
      {art === "earbuds" && (
        <g>
          <rect x="85" y="110" width="130" height="110" rx="44" fill={`url(#${id})`} stroke={lo} />
          <path d="M85 150h130" stroke={lo} />
          <circle cx="150" cy="185" r="4" fill="#2e7d32" opacity=".7" />
          <ellipse cx="110" cy="85" rx="18" ry="22" fill={hi} stroke={lo} />
          <rect x="104" y="92" width="12" height="40" rx="6" fill={hi} stroke={lo} transform="rotate(-12 110 112)" />
          <ellipse cx="192" cy="85" rx="18" ry="22" fill={hi} stroke={lo} />
          <rect x="186" y="92" width="12" height="40" rx="6" fill={hi} stroke={lo} transform="rotate(12 192 112)" />
        </g>
      )}
      {art === "case" && (
        <g>
          <rect x="88" y="34" width="124" height="232" rx="30" fill={`url(#${id})`} opacity=".92" stroke={lo} strokeWidth="2" />
          <rect x="102" y="48" width="56" height="56" rx="14" fill="#fff" opacity=".55" stroke={lo} />
          <circle cx="150" cy="170" r="34" fill="none" stroke={lo} strokeWidth="3" opacity=".5" />
        </g>
      )}
      {art === "glass" && (
        <g>
          <rect x="96" y="40" width="118" height="224" rx="24" fill="#dfe9f1" opacity=".75" stroke="#b8c7d4" strokeWidth="2" />
          <rect x="86" y="36" width="118" height="224" rx="24" fill="#eef4f8" opacity=".85" stroke="#c4d2dd" strokeWidth="2" />
          <path d="M110 70l50-24M110 110l80-40" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".9" />
        </g>
      )}
      {art === "charger" && (
        <g>
          <rect x="95" y="100" width="110" height="110" rx="22" fill={`url(#${id})`} stroke={lo} />
          <rect x="125" y="60" width="10" height="42" rx="3" fill="#a7adb5" />
          <rect x="165" y="60" width="10" height="42" rx="3" fill="#a7adb5" />
          <rect x="135" y="185" width="30" height="10" rx="5" fill={shade(body, -0.35)} />
        </g>
      )}
      {art === "cable" && (
        <g fill="none">
          <path d="M80 220c0-90 140-30 140-120 0-30-20-50-50-50" stroke={body} strokeWidth="12" strokeLinecap="round" />
          <rect x="62" y="215" width="36" height="46" rx="8" fill={hi} stroke={lo} />
          <rect x="150" y="34" width="36" height="34" rx="8" fill={hi} stroke={lo} />
        </g>
      )}
      {art === "powerbank" && (
        <g>
          <rect x="85" y="50" width="130" height="200" rx="28" fill={`url(#${id})`} stroke={lo} />
          <circle cx="150" cy="150" r="40" fill="none" stroke={shade(body, 0.25)} strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={126 + i * 13} y="220" width="9" height="5" rx="2" fill={i < 3 ? "#F07F04" : shade(body, 0.2)} />)}
        </g>
      )}
      {art === "headset" && (
        <g>
          <path d="M120 110c0-30 60-30 60 0" fill="none" stroke={lo} strokeWidth="10" strokeLinecap="round" />
          <rect x="105" y="100" width="40" height="90" rx="20" fill={`url(#${id})`} />
          <rect x="140" y="160" width="90" height="12" rx="6" fill={lo} />
        </g>
      )}
      {art === "tag" && (
        <g>
          <circle cx="150" cy="150" r="70" fill="#f7f7f7" stroke="#d5d8dc" strokeWidth="3" />
          <circle cx="150" cy="150" r="50" fill={`url(#${id})`} opacity=".25" />
          <circle cx="150" cy="150" r="10" fill="#9aa1a9" />
        </g>
      )}
    </svg>
  );
}
