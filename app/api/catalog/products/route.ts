import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { CatalogQueryService } from "@/services/catalog-query.service";
import { publicProductsQuerySchema } from "@/validators/catalog.validator";
import { parseQuery } from "@/validators/request";

const catalogQueryService = new CatalogQueryService();

export const GET = withErrorHandling(async (request) => {
  const query = parseQuery(request, publicProductsQuerySchema);
  const result = await catalogQueryService.listProducts(query);

  return NextResponse.json({ data: result }, { status: 200 });
});
