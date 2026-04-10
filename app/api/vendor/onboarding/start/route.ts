import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AuthService } from "@/services/auth.service";
import { VendorOnboardingService } from "@/services/vendor-onboarding.service";
import { startVendorOnboardingSchema } from "@/validators/vendor.validator";
import { parseBody } from "@/validators/request";

const vendorOnboardingService = new VendorOnboardingService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, startVendorOnboardingSchema);
  const metadata = AuthService.fromRequest(request);
  const result = await vendorOnboardingService.start(input, metadata);

  return NextResponse.json({ data: result }, { status: 201 });
});
