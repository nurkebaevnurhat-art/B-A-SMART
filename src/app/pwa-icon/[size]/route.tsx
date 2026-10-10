import { appIcon } from "@/lib/app-icon";

const SIZES = new Set([192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const n = Number(size);
  if (!SIZES.has(n)) return new Response("Not found", { status: 404 });
  const maskable = new URL(req.url).searchParams.get("maskable") === "1";
  const res = appIcon(n, maskable);
  res.headers.set("cache-control", "public, max-age=86400");
  return res;
}
