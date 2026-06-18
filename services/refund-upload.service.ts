import "server-only";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { ensureCloudinaryConfigured, uploadBufferToCloudinary } from "@/lib/cloudinary/configure";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { RefundCaseRepository } from "@/repositories/refund-case.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export class RefundUploadService {
  constructor(
    private readonly refundCaseRepository = new RefundCaseRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository()
  ) {}

  async upload(
    auth: AuthenticatedUser,
    input: {
      buffer: Buffer;
      mimeType: string;
      refundCaseId?: string;
    }
  ): Promise<{ url: string; publicId: string }> {
    ensureCloudinaryConfigured();

    if (!(ALLOWED_MIME as readonly string[]).includes(input.mimeType)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Unsupported file type",
        statusCode: 400,
      });
    }

    if (input.buffer.byteLength > MAX_BYTES) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "File exceeds 10 MB limit",
        statusCode: 400,
      });
    }

    if (input.refundCaseId) {
      await this.assertCaseAccess(auth, input.refundCaseId);
    } else if (auth.role !== "CUSTOMER") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "refundCaseId is required for this upload",
        statusCode: 400,
      });
    }

    const folder = input.refundCaseId
      ? `refunds/${input.refundCaseId}`
      : `refunds/customers/${auth.id}`;

    const resourceType = input.mimeType.startsWith("image/") ? "image" : "raw";
    const uploaded = await uploadBufferToCloudinary({
      buffer: input.buffer,
      folder,
      resourceType,
    });

    return {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    };
  }

  private async assertCaseAccess(auth: AuthenticatedUser, refundCaseId: string) {
    const refundCase = await this.refundCaseRepository.findById(refundCaseId);

    if (!refundCase) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Refund case not found",
        statusCode: 404,
      });
    }

    const vendorUserId = refundCase.orderItem.orderVendor.vendorProfile.user.id;
    const isCustomer = refundCase.customerUserId === auth.id;
    const isVendor = vendorUserId === auth.id;
    const isAdmin = auth.role === "ADMIN";

    if (!isCustomer && !isVendor && !isAdmin) {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Access denied for refund case",
        statusCode: 403,
      });
    }
  }
}
