import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { CatalogQueryService } from "@/services/catalog-query.service";
import { productIdParamsSchema } from "@/validators/catalog.validator";
import { parseParams } from "@/validators/request";

const catalogQueryService = new CatalogQueryService();

export const GET = withErrorHandling(async (_request, context) => {
  const params = parseParams(await context.params, productIdParamsSchema);
  const result = await catalogQueryService.getProduct(params.id);

  return NextResponse.json({ data: result }, { status: 200 });
});
