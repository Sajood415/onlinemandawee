export const businessTypes = ["INDIVIDUAL", "REGISTERED_BUSINESS"] as const;
export const kycDocumentTypes = [
  "PASSPORT",
  "DRIVERS_LICENSE",
  "NATIONAL_ID",
] as const;
export const payoutMethodTypes = ["BANK", "PAYPAL", "STRIPE"] as const;

export type BusinessType = (typeof businessTypes)[number];
export type KycDocumentType = (typeof kycDocumentTypes)[number];
export type PayoutMethodType = (typeof payoutMethodTypes)[number];
