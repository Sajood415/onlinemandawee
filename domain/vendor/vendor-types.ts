export const businessTypes = ["INDIVIDUAL", "REGISTERED_BUSINESS"] as const;
export const kycDocumentTypes = [
  "PASSPORT",
  "DRIVERS_LICENSE",
  "NATIONAL_ID",
] as const;
export const payoutMethodTypes = ["BANK", "STRIPE"] as const;
export const sellerTypes = ["PLATFORM", "THIRD_PARTY"] as const;

export type BusinessType = (typeof businessTypes)[number];
export type KycDocumentType = (typeof kycDocumentTypes)[number];
export type PayoutMethodType = (typeof payoutMethodTypes)[number];
export type SellerType = (typeof sellerTypes)[number];

/** Shop / industry type slug stored on VendorProfile.industryType (from ShopType). */
export type ShopTypeSlug = string;
