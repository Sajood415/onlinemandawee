import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProductService } from "@/services/vendor-product.service";
import { productIdParamsSchema } from "@/validators/catalog.validator";
import { parseParams } from "@/validators/request";

const vendorProductService = new VendorProductService();

export const POST = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const params = parseParams(await context.params, productIdParamsSchema);
    const result = await vendorProductService.submitForApproval(
      context.auth,
      params.id
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
