import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AuthService } from "@/services/auth.service";
import { refreshTokenSchema } from "@/validators/auth.validator";
import { parseBody } from "@/validators/request";

const authService = new AuthService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, refreshTokenSchema);
  const result = await authService.refresh(input);

  return NextResponse.json({ data: result }, { status: 200 });
});
