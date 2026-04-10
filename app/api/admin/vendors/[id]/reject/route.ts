import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminVendorService } from "@/services/admin-vendor.service";
import { parseOptionalBody, parseParams } from "@/validators/request";
import {
  vendorActionSchema,
  vendorIdParamsSchema,
} from "@/validators/vendor.validator";

const adminVendorService = new AdminVendorService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, vendorIdParamsSchema);
    const body = await parseOptionalBody(request, vendorActionSchema, {});
    const result = await adminVendorService.reject(
      params.id,
      context.auth,
      body.reason
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
