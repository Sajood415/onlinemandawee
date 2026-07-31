import "server-only";

import { env } from "@/config/env";

export const MAX_SUPPLY_REQUEST_IMAGES = 5;
export const MAX_SUPPLY_IMAGE_BYTES = 10 * 1024 * 1024;

export const SUPPLY_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupplyRequestMediaKind = "image";

export function isSupplyRequestMediaKind(
  value: string
): value is SupplyRequestMediaKind {
  return value === "image";
}

export function isAllowedSupplyMediaUrl(url: string) {
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

export function sanitizeSupplyMediaUrls(urls: string[] | undefined, max: number) {
  if (!urls?.length) return [];
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  return unique.filter(isAllowedSupplyMediaUrl).slice(0, max);
}

export function sanitizeReferenceUrls(urls: string[] | undefined, max = 5) {
  if (!urls?.length) return [];
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  return unique
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    })
    .slice(0, max);
}
