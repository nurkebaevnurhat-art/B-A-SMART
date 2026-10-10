import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { hydrateCards } from "@/server/services/catalog";

const schema = z.object({ keys: z.array(z.string().regex(/^[pu]:[a-z0-9]+$/i)).max(100) });

/** Карточки по ключам p:<productId> / u:<unitId> — для гостевого избранного */
export const POST = handler(async (req) => {
  const { keys } = await parseBody(req, schema);
  const cards = await hydrateCards(keys.map((k) => ({ type: k.startsWith("u:") ? ("unit" as const) : ("product" as const), id: k.slice(2) })));
  return cards;
});
