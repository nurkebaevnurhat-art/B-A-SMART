import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { calculate } from "@/server/services/installment";

const schema = z.object({ price: z.number().int().positive(), downPayment: z.number().int().min(0), termMonths: z.number().int().positive() });

export const POST = handler(async (req) => calculate(await parseBody(req, schema)));
