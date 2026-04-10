import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { OtpService } from "@/services/otp.service";
import { verifyOtpSchema } from "@/validators/auth.validator";
import { parseBody } from "@/validators/request";

const otpService = new OtpService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, verifyOtpSchema);
  const result = await otpService.verifyOtp(input);

  return NextResponse.json({ data: result }, { status: 200 });
});
