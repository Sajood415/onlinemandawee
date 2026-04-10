import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorOnboardingService } from "@/services/vendor-onboarding.service";
import { parseBody } from "@/validators/request";
import { vendorKycSchema } from "@/validators/vendor.validator";

const vendorOnboardingService = new VendorOnboardingService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, vendorKycSchema);
    const result = await vendorOnboardingService.saveKyc(context.auth, input);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
