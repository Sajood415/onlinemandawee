import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { ForgotPasswordService } from "@/services/forgot-password.service";
import { forgotPasswordResetSchema } from "@/validators/auth.validator";
import { parseBody } from "@/validators/request";

const forgotPasswordService = new ForgotPasswordService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, forgotPasswordResetSchema);
  const result = await forgotPasswordService.resetPassword(
    input.email,
    input.resetToken,
    input.newPassword
  );
  return NextResponse.json({ data: result }, { status: 200 });
});
