export const vendorStatuses = [
  "ONBOARDING",
  "PENDING_APPROVAL",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED",
] as const;

export type VendorStatus = (typeof vendorStatuses)[number];
