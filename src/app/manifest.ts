import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — смартфоны и аксессуары`,
    short_name: brand.shortName + " Smart",
    description: "Новые и б/у смартфоны, аксессуары, халяльная рассрочка",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: brand.colors.primary,
    lang: "ru",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Каталог смартфонов", url: "/catalog/smartphones" },
      { name: "Б/у смартфоны", url: "/used" },
      { name: "Корзина", url: "/cart" },
    ],
  };
}
