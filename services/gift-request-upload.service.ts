import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  ensureCloudinaryConfigured,
  uploadBufferToCloudinary,
} from "@/lib/cloudinary/configure";
import {
  GIFT_IMAGE_MIME_TYPES,
  GIFT_VIDEO_MIME_TYPES,
  MAX_GIFT_IMAGE_BYTES,
  MAX_GIFT_REQUEST_IMAGES,
  MAX_GIFT_REQUEST_VIDEOS,
  MAX_GIFT_VIDEO_BYTES,
  type GiftRequestMediaKind,
} from "@/lib/gifts/gift-request-media";
import { generateOpaqueToken } from "@/lib/utils/crypto";

export class GiftRequestUploadService {
  async upload(input: {
    kind: GiftRequestMediaKind;
    buffer: Buffer;
    mimeType: string;
    sessionId?: string;
  }) {
    ensureCloudinaryConfigured();

    const session = input.sessionId?.trim() || generateOpaqueToken().slice(0, 12);
    const folder = `mandawee/gift-requests/${session}`;

    if (input.kind === "image") {
      if (!(GIFT_IMAGE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Images must be JPG, PNG, or WebP",
          statusCode: 400,
        });
      }
      if (input.buffer.length > MAX_GIFT_IMAGE_BYTES) {
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
        maxImages: MAX_GIFT_REQUEST_IMAGES,
        maxVideos: MAX_GIFT_REQUEST_VIDEOS,
      };
    }

    if (!(GIFT_VIDEO_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Videos must be MP4, WebM, or MOV",
        statusCode: 400,
      });
    }
    if (input.buffer.length > MAX_GIFT_VIDEO_BYTES) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Video is too large (max 25 MB)",
        statusCode: 400,
      });
    }

    const result = await uploadBufferToCloudinary({
      buffer: input.buffer,
      folder: `${folder}/videos`,
      resourceType: "video",
    });

    return {
      kind: "video" as const,
      url: result.secure_url,
      publicId: result.public_id,
      maxImages: MAX_GIFT_REQUEST_IMAGES,
      maxVideos: MAX_GIFT_REQUEST_VIDEOS,
    };
  }

  async uploadQuotePreview(input: { buffer: Buffer; mimeType: string; requestId?: string }) {
    ensureCloudinaryConfigured();

    if (!(GIFT_IMAGE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Gift preview must be JPG, PNG, or WebP",
        statusCode: 400,
      });
    }

    if (input.buffer.length > MAX_GIFT_IMAGE_BYTES) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Image is too large (max 10 MB)",
        statusCode: 400,
      });
    }

    const folder = input.requestId
      ? `mandawee/gift-request-quotes/${input.requestId}`
      : "mandawee/gift-request-quotes";

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
