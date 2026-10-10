import { handler, searchParamsObject } from "@/lib/api";
import { catalogFacets, parseCatalogQuery } from "@/server/services/catalog";

export const GET = handler(async (req) => catalogFacets(parseCatalogQuery(searchParamsObject(req))));
