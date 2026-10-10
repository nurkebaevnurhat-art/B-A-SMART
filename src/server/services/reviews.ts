import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Напишите хотя бы пару предложений").max(2000),
});

/** Отзыв может оставить только авторизованный пользователь; публикуется после модерации. */
export async function submitReview(user: { id: string; name: string }, input: z.infer<typeof reviewSchema>) {
  const product = await db.product.findUnique({ where: { id: input.productId } });
  if (!product || product.status !== "PUBLISHED") throw new AppError("NOT_FOUND", "Товар не найден");
  const purchased = await db.orderItem.findFirst({
    where: { productId: input.productId, order: { userId: user.id, status: { in: ["DELIVERED", "COMPLETED"] } } },
  });
  return db.review.create({
    data: {
      productId: input.productId,
      userId: user.id,
      authorName: user.name,
      rating: input.rating,
      text: input.text,
      isVerifiedPurchase: !!purchased,
    },
  });
}

export async function latestApprovedReviews(take = 6) {
  return db.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take,
    include: { product: { select: { name: true, slug: true } } },
  });
}
