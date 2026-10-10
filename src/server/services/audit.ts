import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  data?: Prisma.InputJsonValue,
  tx: Tx = db,
) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    // вне контекста запроса (скрипты, тесты)
  }
  await tx.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, data, ip } });
}
