import { handler } from "@/lib/api";
import { getUsedUnitByCode } from "@/server/services/products";

export const GET = handler<{ code: string }>(async (_req, { code }) => {
  const u = await getUsedUnitByCode(code);
  // Не отдаём служебные поля резервирования
  const { reservedByCartId: _r, soldOrderId: _s, ...unit } = u;
  void _r;
  void _s;
  return unit;
});
