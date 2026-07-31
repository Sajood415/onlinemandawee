import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  ensureCloudinaryConfigured,
  uploadBufferToCloudinary,
} from "@/lib/cloudinary/configure";
import {
  MAX_SUPPLY_IMAGE_BYTES,
  MAX_SUPPLY_REQUEST_IMAGES,
  SUPPLY_IMAGE_MIME_TYPES,
  type SupplyRequestMediaKind,
} from "@/lib/supply/supply-request-media";
import { generateOpaqueToken } from "@/lib/utils/crypto";

export class SupplyRequestUploadService {
  async upload(input: {
    kind: SupplyRequestMediaKind;
    buffer: Buffer;
    mimeType: string;
    sessionId?: string;
  }) {
    ensureCloudinaryConfigured();

    const session = input.sessionId?.trim() || generateOpaqueToken().slice(0, 12);
    const folder = `mandawee/supply-requests/${session}`;

    if (!(SUPPLY_IMAGE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Images must be JPG, PNG, or WebP",
        statusCode: 400,
      });
    }
    if (input.buffer.length > MAX_SUPPLY_IMAGE_BYTES) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Image is too large (max 10 MB)",
        statusCode: 400,
      });
    }

    const result = await uploadBufferToCloudinary({
      buffer: input.buffer,
      folder: `${folder}/images`,
      resourceType: "image",
    });

    return {
      kind: "image" as const,
      url: result.secure_url,
      publicId: result.public_id,
      maxImages: MAX_SUPPLY_REQUEST_IMAGES,
    };
  }

  async uploadQuotePreview(input: {
    buffer: Buffer;
    mimeType: string;
    requestId?: string;
  }) {
    ensureCloudinaryConfigured();

    if (!(SUPPLY_IMAGE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Quote image must be JPG, PNG, or WebP",
        statusCode: 400,
      });
    }

    if (input.buffer.length > MAX_SUPPLY_IMAGE_BYTES) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Image is too large (max 10 MB)",
        statusCode: 400,
      });
    }

    const folder = input.requestId
      ? `mandawee/supply-request-quotes/${input.requestId}`
      : "mandawee/supply-request-quotes";

    const result = await uploadBufferToCloudinary({
      buffer: input.buffer,
      folder,
      resourceType: "image",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }
}
