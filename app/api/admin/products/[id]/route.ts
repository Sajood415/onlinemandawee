import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminProductService } from "@/services/admin-product.service";
import {
  adminUpdateProductSchema,
  productIdParamsSchema,
} from "@/validators/catalog.validator";
import { parseBody, parseParams } from "@/validators/request";

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const adminProductService = new AdminProductService();
    const params = parseParams(await context.params, productIdParamsSchema);
    const result = await adminProductService.detail(params.id);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const adminProductService = new AdminProductService();
    const params = parseParams(await context.params, productIdParamsSchema);
    const input = await parseBody(request, adminUpdateProductSchema);
    const result = await adminProductService.update(
      params.id,
      context.auth,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
