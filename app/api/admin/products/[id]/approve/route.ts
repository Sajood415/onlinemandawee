import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminProductService } from "@/services/admin-product.service";
import { productIdParamsSchema } from "@/validators/catalog.validator";
import { parseParams } from "@/validators/request";

const adminProductService = new AdminProductService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const result = await adminProductService.approve(params.id, context.auth);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
