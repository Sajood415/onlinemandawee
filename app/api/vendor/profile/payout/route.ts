import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProfileService } from "@/services/vendor-profile.service";
import { vendorPayoutSchema } from "@/validators/vendor.validator";
import { parseBody } from "@/validators/request";

const vendorProfileService = new VendorProfileService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, vendorPayoutSchema);
    const result = await vendorProfileService.updatePayoutMethod(context.auth, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
