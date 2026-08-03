import "server-only";

import sharp from "sharp";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_MB,
  PRODUCT_IMAGE_MIME_TYPES,
  PRODUCT_IMAGE_WIDTH,
} from "@/lib/products/product-limits";

export async function assertProductImageBuffer(input: {
  buffer: Buffer;
  mimeType: string;
}) {
  if (!(PRODUCT_IMAGE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "Product image must be a JPG, PNG, or WebP file",
      statusCode: 400,
    });
  }

  if (input.buffer.length > PRODUCT_IMAGE_MAX_BYTES) {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: `Product image is too large (max ${PRODUCT_IMAGE_MAX_MB} MB)`,
      statusCode: 400,
    });
  }

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(input.buffer).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "Could not read product image. Use a valid JPG, PNG, or WebP file.",
      statusCode: 400,
    });
  }

  if (
    width !== PRODUCT_IMAGE_WIDTH ||
    height !== PRODUCT_IMAGE_HEIGHT ||
    width !== height
  ) {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: `Product image must be exactly ${PRODUCT_IMAGE_WIDTH}×${PRODUCT_IMAGE_HEIGHT} pixels (square)`,
      statusCode: 400,
    });
  }
}
