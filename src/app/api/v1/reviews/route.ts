import { handler, parseBody } from "@/lib/api";
import { reviewSchema, submitReview } from "@/server/services/reviews";
import { checkRate } from "@/server/services/auth";
import { requireUser } from "@/server/auth/session";

export const POST = handler(async (req) => {
  const user = await requireUser();
  checkRate(`review:${user.id}`, 5, 60 * 60_000);
  const r = await submitReview(user, await parseBody(req, reviewSchema));
  return { id: r.id, status: r.status };
});
