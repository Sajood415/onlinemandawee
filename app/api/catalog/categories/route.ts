import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { CatalogQueryService } from "@/services/catalog-query.service";

const catalogQueryService = new CatalogQueryService();

export const GET = withErrorHandling(async () => {
  const result = await catalogQueryService.listCategories();
  return NextResponse.json({ data: result }, { status: 200 });
});
