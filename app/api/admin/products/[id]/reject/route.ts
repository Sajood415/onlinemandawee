import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminProductService } from "@/services/admin-product.service";
import {
  productActionSchema,
  productIdParamsSchema,
} from "@/validators/catalog.validator";
import { parseOptionalBody, parseParams } from "@/validators/request";

const adminProductService = new AdminProductService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const body = await parseOptionalBody(request, productActionSchema, {});
    const result = await adminProductService.reject(
      params.id,
      context.auth,
      body.reason
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
