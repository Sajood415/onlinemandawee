import {
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MIME_TYPES,
  PRODUCT_IMAGE_WIDTH,
} from "@/lib/products/product-limits";

export type ProductImageFileError =
  | "invalidType"
  | "tooLarge"
  | "notExactSize"
  | "loadFailed";

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("loadFailed"));
    };
    img.src = url;
  });
}

/** Client-side product image checks (MIME, size, exact 900×900). */
export async function validateProductImageFile(
  file: File
): Promise<ProductImageFileError | null> {
  if (!(PRODUCT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "invalidType";
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return "tooLarge";
  }
  try {
    const { width, height } = await readImageDimensions(file);
    if (
      width !== PRODUCT_IMAGE_WIDTH ||
      height !== PRODUCT_IMAGE_HEIGHT ||
      width !== height
    ) {
      return "notExactSize";
    }
  } catch {
    return "loadFailed";
  }
  return null;
}
