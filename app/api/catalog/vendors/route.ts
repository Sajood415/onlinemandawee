import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { CatalogQueryService } from "@/services/catalog-query.service";
import { publicVendorsQuerySchema } from "@/validators/catalog.validator";
import { parseQuery } from "@/validators/request";

const catalogQueryService = new CatalogQueryService();

export const GET = withErrorHandling(async (request) => {
  const query = parseQuery(request, publicVendorsQuerySchema);
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  const result = await catalogQueryService.listVendors({
    industry: query.industry,
    locale,
  });
  return NextResponse.json({ data: result }, { status: 200 });
});
