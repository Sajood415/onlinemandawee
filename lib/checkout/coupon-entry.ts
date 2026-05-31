export type GuestCheckoutCouponEntry = {
  code: string;
  vendorProfileId: string;
};

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export function normalizeGuestCheckoutCoupons(input: {
  couponCodes?: string[];
  vendorCoupons?: GuestCheckoutCouponEntry[];
}): GuestCheckoutCouponEntry[] {
  const seen = new Set<string>();
  const entries: GuestCheckoutCouponEntry[] = [];

  for (const entry of input.vendorCoupons ?? []) {
    const code = normalizeCouponCode(entry.code);
    if (!code || !entry.vendorProfileId) continue;
    const key = `${entry.vendorProfileId}:${code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ code, vendorProfileId: entry.vendorProfileId });
  }

  return entries;
}
