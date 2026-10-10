import { handler } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = handler(async () =>
  db.deliveryOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { code: true, nameRu: true, nameKk: true, description: true, price: true, freeFrom: true, needsAddress: true } }),
);
