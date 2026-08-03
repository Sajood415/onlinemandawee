/** Shared product field / image rules for client + server. */

export const PRODUCT_NAME_MIN = 2;
export const PRODUCT_NAME_MAX = 80;

export const PRODUCT_DESCRIPTION_MIN = 10;
export const PRODUCT_DESCRIPTION_MAX = 1000;

export const PRODUCT_IMAGES_MAX = 10;

export const PRODUCT_IMAGE_WIDTH = 900;
export const PRODUCT_IMAGE_HEIGHT = 900;
export const PRODUCT_IMAGE_MAX_MB = 5;
export const PRODUCT_IMAGE_MAX_BYTES = PRODUCT_IMAGE_MAX_MB * 1024 * 1024;

export const PRODUCT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PRODUCT_IMAGE_ACCEPT = PRODUCT_IMAGE_MIME_TYPES.join(",");

/** Non-product uploads that reuse the vendor product upload route (e.g. promo banners). */
export const BANNER_IMAGE_MAX_MB = 10;
export const BANNER_IMAGE_MAX_BYTES = BANNER_IMAGE_MAX_MB * 1024 * 1024;
