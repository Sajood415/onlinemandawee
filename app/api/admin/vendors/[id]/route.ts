import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminVendorService } from "@/services/admin-vendor.service";
import { parseParams } from "@/validators/request";
import { vendorIdParamsSchema } from "@/validators/vendor.validator";

const adminVendorService = new AdminVendorService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, vendorIdParamsSchema);
    const result = await adminVendorService.detail(params.id);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
