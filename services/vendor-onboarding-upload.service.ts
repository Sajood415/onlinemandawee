import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { env } from "@/config/env";
import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { VendorUploadKind } from "@/domain/vendor/vendor-upload-kind";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

const MAX_BYTES = 10 * 1024 * 1024;

const MIME_BY_KIND: Record<VendorUploadKind, readonly string[]> = {
  logo: ["image/jpeg", "image/png", "image/webp"],
  kyc_document: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  kyc_selfie: ["image/jpeg", "image/png", "image/webp"],
  business_license: ["image/jpeg", "image/png", "image/webp"],
  address_proof: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};

const folderSegment: Record<VendorUploadKind, string> = {
  logo: "logo",
  kyc_document: "kyc/id-document",
  kyc_selfie: "kyc/selfie",
  business_license: "kyc/business-license",
  address_proof: "address/proof",
};

function assertVendorEditable(status: string) {
  if (status === "PENDING_APPROVAL" || status === "ACTIVE" || status === "SUSPENDED") {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "Vendor onboarding cannot be edited in the current state",
      statusCode: 400,
    });
  }
}

function ensureCloudinaryConfigured() {
  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError({
      code: ERROR_CODE.INTERNAL_SERVER_ERROR,
      message: "File uploads are not configured",
      statusCode: 503,
    });
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export class VendorOnboardingUploadService {
  private vendorProfileRepository = new VendorProfileRepository();

  async upload(
    auth: AuthenticatedUser,
    input: {
      kind: VendorUploadKind;
      buffer: Buffer;
      mimeType: string;
    }
  ): Promise<{ url: string; publicId: string }> {
    ensureCloudinaryConfigured();

    const vendor = await this.vendorProfileRepository.findByUserId(auth.id);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    assertVendorEditable(vendor.status);

    const allowed = MIME_BY_KIND[input.kind];
    if (!allowed.includes(input.mimeType)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "File type not allowed for this upload",
        statusCode: 400,
      });
    }

    if (input.buffer.length > MAX_BYTES) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "File is too large (max 10 MB)",
        statusCode: 400,
      });
    }

    const folder = `mandawee/vendors/${vendor.id}/${folderSegment[input.kind]}`;
    const resourceType = input.mimeType === "application/pdf" ? "raw" : "image";

    const uploadOptions: {
      folder: string;
      resource_type: "image" | "raw";
      use_filename: boolean;
      unique_filename: boolean;
    } = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    };

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        if (!res?.secure_url || !res.public_id) {
          reject(new Error("Upload failed"));
          return;
        }
        resolve({ secure_url: res.secure_url, public_id: res.public_id });
      });
      stream.end(input.buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }
}
