import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/api";
import { openApiDocument } from "@/server/openapi";

export function GET(req: NextRequest) {
  return NextResponse.json(openApiDocument(appUrl(req)), { headers: { "access-control-allow-origin": "*" } });
}
