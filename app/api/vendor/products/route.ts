import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProductService } from "@/services/vendor-product.service";
import { createProductSchema } from "@/validators/catalog.validator";
import { parseBody } from "@/validators/request";

const vendorProductService = new VendorProductService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await vendorProductService.list(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, createProductSchema);
    const result = await vendorProductService.create(context.auth, input);

    return NextResponse.json({ data: result }, { status: 201 });
  })
);
