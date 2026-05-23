export const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const humanizeSlug = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export function formatVendorStoreName(
  storeName: string | null | undefined,
  storeSlug?: string | null
) {
  const trimmed = storeName?.trim();
  if (!trimmed) return null;
  if (storeSlug && trimmed === storeSlug) return humanizeSlug(trimmed);
  if (trimmed === slugify(trimmed)) return humanizeSlug(trimmed);
  return trimmed;
}
