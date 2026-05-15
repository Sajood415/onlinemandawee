import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { ForgotPasswordService } from "@/services/forgot-password.service";
import { forgotPasswordRequestSchema } from "@/validators/auth.validator";
import { parseBody } from "@/validators/request";

const forgotPasswordService = new ForgotPasswordService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, forgotPasswordRequestSchema);
  const result = await forgotPasswordService.requestReset(input.email);
  return NextResponse.json({ data: result }, { status: 200 });
});
