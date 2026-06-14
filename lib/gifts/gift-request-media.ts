import "server-only";

import { env } from "@/config/env";

export const MAX_GIFT_REQUEST_IMAGES = 5;
export const MAX_GIFT_REQUEST_VIDEOS = 2;
export const MAX_GIFT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_GIFT_VIDEO_BYTES = 25 * 1024 * 1024;

export const GIFT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const GIFT_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type GiftRequestMediaKind = "image" | "video";

export function isGiftRequestMediaKind(value: string): value is GiftRequestMediaKind {
  return value === "image" || value === "video";
}

export function isAllowedGiftMediaUrl(url: string) {
  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.includes(`/${cloudName}/`)
    );
  } catch {
    return false;
  }
}

export function sanitizeGiftMediaUrls(urls: string[] | undefined, max: number) {
  if (!urls?.length) return [];
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  return unique.filter(isAllowedGiftMediaUrl).slice(0, max);
}
