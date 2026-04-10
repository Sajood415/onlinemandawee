export const vendorOnboardingSteps = [
  "ACCOUNT_SETUP",
  "STORE_INFORMATION",
  "IDENTITY_VERIFICATION",
  "ADDRESS_CONTACT",
  "PAYOUT_INFORMATION",
  "AGREEMENTS",
  "SUBMITTED",
] as const;

export type VendorOnboardingStep =
  (typeof vendorOnboardingSteps)[number];
