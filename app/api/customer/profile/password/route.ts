import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CustomerProfileService } from "@/services/customer-profile.service";
import { changeCustomerPasswordSchema } from "@/validators/customer.validator";
import { parseBody } from "@/validators/request";

const customerProfileService = new CustomerProfileService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, changeCustomerPasswordSchema);
    const result = await customerProfileService.changePassword(context.auth, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
