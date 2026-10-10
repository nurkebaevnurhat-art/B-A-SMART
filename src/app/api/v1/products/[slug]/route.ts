import { handler } from "@/lib/api";
import { getCompatibleAccessories, getProductBySlug, getSimilarProducts } from "@/server/services/products";

export const GET = handler<{ slug: string }>(async (_req, { slug }) => {
  const p = await getProductBySlug(slug);
  const min = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : 0;
  const [accessories, similar] = await Promise.all([getCompatibleAccessories(p.modelKey), getSimilarProducts(p, min || 100000)]);
  return { product: p, accessories, similar };
});
