import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProfileService } from "@/services/vendor-profile.service";
import { parseBody } from "@/validators/request";
import { vendorAddressSchema } from "@/validators/vendor.validator";

const vendorProfileService = new VendorProfileService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, vendorAddressSchema);
    const result = await vendorProfileService.updateAddress(context.auth, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
