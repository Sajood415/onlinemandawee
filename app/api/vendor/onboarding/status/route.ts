import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorOnboardingService } from "@/services/vendor-onboarding.service";

const vendorOnboardingService = new VendorOnboardingService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await vendorOnboardingService.getStatus(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
