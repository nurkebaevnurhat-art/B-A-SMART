import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Отдача загруженных изображений (хранятся в PostgreSQL) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await db.mediaFile.findUnique({ where: { id } });
  if (!f) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(f.data), {
    headers: { "content-type": f.mime, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
