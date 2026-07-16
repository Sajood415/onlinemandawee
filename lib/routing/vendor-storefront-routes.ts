const VENDOR_SHOP_PATH = /^\/vendors\/[^/]+$/;

/** Locale-stripped path like `/vendors/acme-store` (not `/vendors` listing). */
export function isVendorShopPathname(pathname: string): boolean {
  return VENDOR_SHOP_PATH.test(pathname);
}
