import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminProductService } from "@/services/admin-product.service";
import { adminProductsQuerySchema } from "@/validators/catalog.validator";
import { parseQuery } from "@/validators/request";

const adminProductService = new AdminProductService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const query = parseQuery(request, adminProductsQuerySchema);
    const result = await adminProductService.list(query.approvalStatus);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
