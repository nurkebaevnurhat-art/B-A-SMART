import { handler, searchParamsObject } from "@/lib/api";
import { listCatalog, parseCatalogQuery } from "@/server/services/catalog";

export const GET = handler(async (req) => listCatalog(parseCatalogQuery(searchParamsObject(req))));
