import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { CatalogQueryService } from "@/services/catalog-query.service";

const catalogQueryService = new CatalogQueryService();

export const GET = withErrorHandling(async (request) => {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  const result = await catalogQueryService.listVendorCategoryGroups(locale);
  return NextResponse.json({ data: result }, { status: 200 });
});
