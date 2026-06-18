import { NextResponse } from "next/server";

import { withAuth } from "@/middlewares/with-auth";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { RefundUploadService } from "@/services/refund-upload.service";

const uploadService = new RefundUploadService();

export const POST = withErrorHandling(
  withAuth(async (request, context) => {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Expected multipart form data",
        statusCode: 400,
      });
    }

    const file = form.get("file");
    const refundCaseIdRaw = form.get("refundCaseId");

    if (!(file instanceof File)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Missing file",
        statusCode: 400,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const refundCaseId =
      typeof refundCaseIdRaw === "string" && refundCaseIdRaw.trim()
        ? refundCaseIdRaw.trim()
        : undefined;

    const result = await uploadService.upload(context.auth, {
      buffer,
      mimeType,
      refundCaseId,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
