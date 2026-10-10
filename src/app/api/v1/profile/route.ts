import { handler, parseBody } from "@/lib/api";
import { profileSchema, updateProfile } from "@/server/services/auth";
import { requireUser } from "@/server/auth/session";

export const PATCH = handler(async (req) => {
  const user = await requireUser();
  return updateProfile(user.id, await parseBody(req, profileSchema));
});
