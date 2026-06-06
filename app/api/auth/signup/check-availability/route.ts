import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AuthService } from "@/services/auth.service";
import { signupAvailabilitySchema } from "@/validators/auth.validator";
import { parseBody } from "@/validators/request";

const authService = new AuthService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, signupAvailabilitySchema);
  const result = await authService.assertSignupIdentifiersAvailable(input);

  return NextResponse.json({ data: { available: true, ...result } }, { status: 200 });
});
