import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AuthService } from "@/services/auth.service";
import { registerCustomerSchema } from "@/validators/auth.validator";
import { parseBody } from "@/validators/request";

const authService = new AuthService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, registerCustomerSchema);
  const metadata = AuthService.fromRequest(request);
  const result = await authService.registerCustomer(input, metadata);

  return NextResponse.json({ data: result }, { status: 201 });
});
