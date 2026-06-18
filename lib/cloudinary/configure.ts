import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";

export function ensureCloudinaryConfigured() {
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
  return cloudName;
}

export function uploadBufferToCloudinary(input: {
  buffer: Buffer;
  folder: string;
  resourceType: "image" | "video" | "raw";
}) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: input.folder,
        resource_type: input.resourceType,
        use_filename: true,
        unique_filename: true,
      },
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
  });
}
