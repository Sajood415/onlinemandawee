import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorOnboardingService } from "@/services/vendor-onboarding.service";
import { parseBody } from "@/validators/request";
import { vendorAgreementsSchema } from "@/validators/vendor.validator";

const vendorOnboardingService = new VendorOnboardingService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, vendorAgreementsSchema);
    const result = await vendorOnboardingService.saveAgreements(
      context.auth,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
