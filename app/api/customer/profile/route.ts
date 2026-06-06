import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CustomerProfileService } from "@/services/customer-profile.service";
import { updateCustomerProfileSchema } from "@/validators/customer.validator";
import { parseBody } from "@/validators/request";

const customerProfileService = new CustomerProfileService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const profile = await customerProfileService.getProfile(context.auth);
    return NextResponse.json({ data: profile }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, updateCustomerProfileSchema);
    const profile = await customerProfileService.updateProfile(context.auth, input);
    return NextResponse.json({ data: profile }, { status: 200 });
  })
);
