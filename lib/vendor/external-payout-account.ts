type VendorPayoutMethodLike = {
  accountNumberOrIban?: string | null;
  accountName?: string | null;
  stripeEmail?: string | null;
};

/** Vendor can receive off-platform payouts (foreign bank or PayPal / Stripe email). */
export function vendorHasExternalPayoutAccount(
  payoutMethod: VendorPayoutMethodLike | null | undefined
) {
  if (!payoutMethod) {
    return false;
  }

  const hasBank =
    Boolean(payoutMethod.accountNumberOrIban?.trim()) &&
    Boolean(payoutMethod.accountName?.trim());
  const hasPayPal = Boolean(payoutMethod.stripeEmail?.trim());

  return hasBank || hasPayPal;
}
