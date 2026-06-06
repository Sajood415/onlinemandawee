import { NextResponse } from "next/server";
import { z } from "zod";

import { passwordFieldSchema } from "@/lib/auth/password-policy";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CustomerProfileService } from "@/services/customer-profile.service";
import { parseBody } from "@/validators/request";

const customerProfileService = new CustomerProfileService();

const resetVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

const resetConfirmSchema = z.object({
  resetToken: z.string().min(20),
  newPassword: passwordFieldSchema,
});

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const result = await customerProfileService.requestPasswordResetEmail(
      context.auth
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, resetVerifySchema);
    const result = await customerProfileService.verifyPasswordResetCode(
      context.auth,
      input.code
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PUT = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, resetConfirmSchema);
    const result = await customerProfileService.resetPasswordWithToken(
      context.auth,
      input
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
