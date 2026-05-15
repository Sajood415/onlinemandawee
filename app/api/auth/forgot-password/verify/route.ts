import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { ForgotPasswordService } from "@/services/forgot-password.service";
import { forgotPasswordVerifySchema } from "@/validators/auth.validator";
import { parseBody } from "@/validators/request";

const forgotPasswordService = new ForgotPasswordService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, forgotPasswordVerifySchema);
  const result = await forgotPasswordService.verifyResetCode(
    input.email,
    input.code
  );
  return NextResponse.json({ data: result }, { status: 200 });
});
