import { handler, parseBody } from "@/lib/api";
import { db } from "@/lib/db";
import { applicationSchema, createApplication } from "@/server/services/installment";
import { checkRate } from "@/server/services/auth";
import { getCurrentUser, requireUser } from "@/server/auth/session";

export const GET = handler(async () => {
  const user = await requireUser();
  return db.installmentApplication.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
});

export const POST = handler(async (req) => {
  checkRate(`inst:${req.headers.get("x-forwarded-for") ?? "local"}`, 10, 60 * 60_000);
  const input = await parseBody(req, applicationSchema);
  const user = await getCurrentUser();
  const app = await createApplication(input, user?.id ?? null);
  return { number: app.number, status: app.status, isDemo: app.isDemo };
});
