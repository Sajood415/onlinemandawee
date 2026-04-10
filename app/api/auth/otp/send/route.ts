import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { OtpService } from "@/services/otp.service";
import { parseBody } from "@/validators/request";
import { sendOtpSchema } from "@/validators/auth.validator";

const otpService = new OtpService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, sendOtpSchema);
  const result = await otpService.sendOtp(input);

  return NextResponse.json({ data: result }, { status: 200 });
});
