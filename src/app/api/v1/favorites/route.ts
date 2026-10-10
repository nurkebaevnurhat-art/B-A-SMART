import { handler, parseBody } from "@/lib/api";
import { addFavorite, favoriteSchema, listFavorites, removeFavorite } from "@/server/services/favorites";
import { requireUser } from "@/server/auth/session";

export const GET = handler(async () => listFavorites((await requireUser()).id));

export const POST = handler(async (req) => {
  const user = await requireUser();
  await addFavorite(user.id, await parseBody(req, favoriteSchema));
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const user = await requireUser();
  await removeFavorite(user.id, await parseBody(req, favoriteSchema));
  return { ok: true };
});
