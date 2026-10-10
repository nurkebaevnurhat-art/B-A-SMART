import { handler } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";

/** Договоры и графики платежей текущего пользователя */
export const GET = handler(async () => {
  const user = await requireUser();
  return db.installmentContract.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { schedule: { orderBy: { seq: "asc" } }, application: { select: { itemName: true } } },
  });
});
