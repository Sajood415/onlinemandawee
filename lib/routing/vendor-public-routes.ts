const VENDOR_PUBLIC_ROUTE_PREFIXES = ["/vendor/register", "/vendor/terms"] as const;

export function isVendorPublicRoute(pathname: string): boolean {
  return VENDOR_PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.includes(prefix));
}
