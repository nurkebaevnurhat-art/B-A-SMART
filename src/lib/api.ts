import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "./errors";

/** Единый формат ответа API: { data } или { error: { code, message, details? } } */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function errorResponse(e: unknown) {
  if (e instanceof AppError) {
    return NextResponse.json({ error: { code: e.code, message: e.message, details: e.details } }, { status: e.status });
  }
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of e.issues) {
      const k = issue.path.join(".") || "_";
      if (!fields[k]) fields[k] = issue.message;
    }
    return NextResponse.json(
      { error: { code: "VALIDATION", message: Object.values(fields)[0] ?? "Проверьте введённые данные", details: { fields } } },
      { status: 422 },
    );
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return NextResponse.json({ error: { code: "CONFLICT", message: "Запись с такими данными уже существует" } }, { status: 409 });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Объект не найден" } }, { status: 404 });
  }
  console.error(e);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Внутренняя ошибка сервера" } }, { status: 500 });
}

type Ctx<P> = { params: Promise<P> };

export function handler<P = Record<string, string>>(fn: (req: NextRequest, params: P) => Promise<Response | unknown>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const res = await fn(req, ctx?.params ? await ctx.params : ({} as P));
      return res instanceof Response ? res : ok(res);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Ожидается JSON");
  }
  return schema.parse(json);
}

export function searchParamsObject(req: NextRequest): Record<string, string> {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

export function appUrl(req?: NextRequest) {
  return process.env.APP_URL?.replace(/\/$/, "") || (req ? req.nextUrl.origin : "http://localhost:5520");
}
