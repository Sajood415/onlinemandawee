import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminVendorService } from "@/services/admin-vendor.service";
import { parseBody, parseParams } from "@/validators/request";
import {
  adminVendorSellerTypeUpdateSchema,
  vendorIdParamsSchema,
} from "@/validators/vendor.validator";

const adminVendorService = new AdminVendorService();

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, vendorIdParamsSchema);
    const body = await parseBody(request, adminVendorSellerTypeUpdateSchema);
    const result = await adminVendorService.updateSellerType(params.id, body, context.auth);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
