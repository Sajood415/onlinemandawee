import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

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

export class AdminProductUploadService {
  async uploadProductImage(input: {
    buffer: Buffer;
    mimeType: string;
  }): Promise<{ url: string; publicId: string }> {
    return this.uploadImage(input, "mandawee/admin/products");
  }

  async uploadCategoryImage(input: {
    buffer: Buffer;
    mimeType: string;
  }): Promise<{ url: string; publicId: string }> {
    return this.uploadImage(input, "mandawee/admin/categories");
  }

  async uploadHomeBannerImage(input: {
    buffer: Buffer;
    mimeType: string;
  }): Promise<{ url: string; publicId: string }> {
    return this.uploadImage(input, "mandawee/admin/home-banners");
  }

  private async uploadImage(
    input: { buffer: Buffer; mimeType: string },
    folder: string
  ): Promise<{ url: string; publicId: string }> {
    ensureCloudinaryConfigured();

    if (!(ALLOWED_MIME as readonly string[]).includes(input.mimeType)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Image must be a JPG, PNG, or WebP file",
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

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "image", use_filename: true, unique_filename: true },
          (err, res) => {
            if (err) {
              reject(err);
              return;
            }
            if (!res?.secure_url || !res.public_id) {
              reject(new Error("Upload failed"));
              return;
            }
            resolve({ secure_url: res.secure_url, public_id: res.public_id });
          }
        );
        stream.end(input.buffer);
      }
    );

    return { url: result.secure_url, publicId: result.public_id };
  }
}
