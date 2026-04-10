import { NextResponse } from "next/server";

import { withAuth } from "@/middlewares/with-auth";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AuthService } from "@/services/auth.service";

const authService = new AuthService();

export const GET = withErrorHandling(
  withAuth(async (_request, context) => {
    const result = authService.getCurrentUser(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
