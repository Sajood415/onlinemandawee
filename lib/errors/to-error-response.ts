import { NextResponse } from "next/server";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";

const buildErrorPayload = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      },
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      body: {
        error: {
          code: ERROR_CODE.VALIDATION_ERROR,
          message: "Validation failed",
          details: error.flatten(),
        },
      },
    };
  }

  if (error instanceof PrismaClientKnownRequestError) {
    return {
      statusCode: 409,
      body: {
        error: {
          code: ERROR_CODE.CONFLICT,
          message: error.message,
          details: {
            prismaCode: error.code,
            meta: error.meta,
          },
        },
      },
    };
  }

  if (error instanceof PrismaClientInitializationError) {
    return {
      statusCode: 503,
      body: {
        error: {
          code: ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: "Database unavailable",
          details: null,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
        details: null,
      },
    },
  };
};

export const toErrorResponse = (error: unknown) => {
  const payload = buildErrorPayload(error);
  return NextResponse.json(payload.body, { status: payload.statusCode });
};
