import { handler } from "@/lib/api";
import { searchSuggestions } from "@/server/services/catalog";

export const GET = handler(async (req) => searchSuggestions((req.nextUrl.searchParams.get("q") ?? "").slice(0, 100)));
