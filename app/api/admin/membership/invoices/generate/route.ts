import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message:
        "Manual membership invoice generation is disabled. Stripe subscription billing manages membership charges.",
      statusCode: 400,
    });
  })
);
