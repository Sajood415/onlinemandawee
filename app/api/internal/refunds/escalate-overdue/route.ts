import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { RefundService } from "@/services/refund.service";

const refundService = new RefundService();

function assertInternalSecret(request: Request) {
  const secret = env.REALTIME_INTERNAL_SECRET?.trim();
  if (!secret) {
    throw new AppError({
      code: ERROR_CODE.INTERNAL_SERVER_ERROR,
      message: "Internal scheduler is not configured",
      statusCode: 503,
    });
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    throw new AppError({
      code: ERROR_CODE.UNAUTHORIZED,
      message: "Invalid internal authorization",
      statusCode: 401,
    });
  }
}

export const POST = withErrorHandling(async (request) => {
  assertInternalSecret(request);
  const result = await refundService.runOverdueEscalation();
  return NextResponse.json({ data: result }, { status: 200 });
});
