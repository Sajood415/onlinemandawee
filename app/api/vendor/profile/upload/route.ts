import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { VendorProfileUploadService } from "@/services/vendor-profile-upload.service";

const uploadService = new VendorProfileUploadService();

export const POST = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
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
    if (!(file instanceof File)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Missing file",
        statusCode: 400,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    const result = await uploadService.uploadLogo(context.auth, { buffer, mimeType });
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
