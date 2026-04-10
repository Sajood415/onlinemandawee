import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProductService } from "@/services/vendor-product.service";
import {
  productIdParamsSchema,
  updateProductSchema,
} from "@/validators/catalog.validator";
import { parseBody, parseParams } from "@/validators/request";

const vendorProductService = new VendorProductService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const input = await parseBody(request, updateProductSchema);
    const result = await vendorProductService.update(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const DELETE = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const result = await vendorProductService.archive(context.auth, params.id);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
