export const MEMBERSHIP_BILLING_SUSPENSION_REASON =
  "Shop suspended: unpaid marketplace subscription";

export const DEFAULT_MEMBERSHIP_GRACE_DAYS = 5;

export function isMembershipBillingSuspension(reason: string | null | undefined) {
  return (
    typeof reason === "string" &&
    reason.startsWith("Shop suspended: unpaid marketplace subscription")
  );
}

type VendorSubscriptionStatus = "TRIAL" | "ACTIVE" | "FAILED" | "SUSPENDED";

export function vendorHasUnresolvedBillingFailure(
  vendor: {
    subscriptionStatus: VendorSubscriptionStatus;
    subscriptionGracePeriodEndsAt: Date | null;
  },
  now = new Date()
) {
  if (vendor.subscriptionStatus === "SUSPENDED") {
    return true;
  }

  if (vendor.subscriptionStatus === "FAILED") {
    if (!vendor.subscriptionGracePeriodEndsAt) {
      return true;
    }
    return now >= vendor.subscriptionGracePeriodEndsAt;
  }

  return false;
}

export function formatGracePeriodLabel(
  graceDays = DEFAULT_MEMBERSHIP_GRACE_DAYS
) {
  return graceDays === 1 ? "1 day" : `${graceDays} days`;
}
