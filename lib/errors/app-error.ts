import { ERROR_CODE, type ErrorCode } from "@/lib/errors/error-codes";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(params: {
    code?: ErrorCode;
    message: string;
    statusCode?: number;
    details?: unknown;
  }) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code ?? ERROR_CODE.INTERNAL_SERVER_ERROR;
    this.statusCode = params.statusCode ?? 500;
    this.details = params.details;
  }
}
