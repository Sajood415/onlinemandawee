type VendorPayoutMethodLike = {
  accountNumberOrIban?: string | null;
  accountName?: string | null;
};

/** Vendor can receive off-platform payouts via bank transfer. */
export function vendorHasExternalPayoutAccount(
  payoutMethod: VendorPayoutMethodLike | null | undefined
) {
  if (!payoutMethod) {
    return false;
  }

  return (
    Boolean(payoutMethod.accountNumberOrIban?.trim()) &&
    Boolean(payoutMethod.accountName?.trim())
  );
}
