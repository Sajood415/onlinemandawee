export const vendorUploadKinds = [
  "logo",
  "kyc_document",
  "kyc_selfie",
  "business_license",
  "address_proof",
] as const;

export type VendorUploadKind = (typeof vendorUploadKinds)[number];

export function isVendorUploadKind(value: string): value is VendorUploadKind {
  return (vendorUploadKinds as readonly string[]).includes(value);
}
