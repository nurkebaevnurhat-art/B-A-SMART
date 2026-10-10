import { handler, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import { createTicket, ticketSchema } from "@/server/services/support";
import { requireUser } from "@/server/auth/session";

export const GET = handler(async () => {
  const user = await requireUser();
  return db.supportTicket.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const t = await createTicket(user.id, await parseBody(req, ticketSchema));
  return { id: t.id, status: t.status };
});
