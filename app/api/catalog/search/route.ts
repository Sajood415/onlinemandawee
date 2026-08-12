import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { CatalogQueryService } from "@/services/catalog-query.service";
import { publicMarketplaceSearchSchema } from "@/validators/catalog.validator";
import { parseQuery } from "@/validators/request";

const catalogQueryService = new CatalogQueryService();

export const GET = withErrorHandling(async (request) => {
  const query = parseQuery(request, publicMarketplaceSearchSchema);
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  const result = query.suggest
    ? await catalogQueryService.suggestMarketplace(query.q, locale)
    : await catalogQueryService.searchMarketplace(query.q, locale);
  return NextResponse.json({ data: result }, { status: 200 });
});
