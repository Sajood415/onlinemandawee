import {
  DEFAULT_MEMBERSHIP_GRACE_DAYS,
  isMembershipBillingSuspension,
  MEMBERSHIP_BILLING_SUSPENSION_REASON,
} from "@/lib/membership/billing-shared";

export const MEMBERSHIP_UNPAID_SUSPENSION_REASON = MEMBERSHIP_BILLING_SUSPENSION_REASON;

export { isMembershipBillingSuspension };

export type MembershipOverdueLevel = "none" | "warning" | "critical" | "suspended";

export function resolveMembershipBillingAlertLevel(input: {
  subscriptionStatus: "TRIAL" | "ACTIVE" | "FAILED" | "SUSPENDED";
  gracePeriodEndsAt?: Date | null;
  now?: Date;
}): MembershipOverdueLevel {
  const now = input.now ?? new Date();

  if (input.subscriptionStatus === "SUSPENDED") {
    return "suspended";
  }

  if (input.subscriptionStatus === "FAILED") {
    if (input.gracePeriodEndsAt != null && now >= input.gracePeriodEndsAt) {
      return "suspended";
    }
    return "critical";
  }

  return "none";
}

export function formatMoneyMinor(
  amountMinor: number,
  currency: string,
  locale = "en-US"
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    const value = (amountMinor / 100).toFixed(2);
    return currency === "USD" ? `$${value}` : `${value} ${currency}`;
  }
}

export function formatMembershipFee(amountCents: number, currency: string) {
  return formatMoneyMinor(amountCents, currency, "en-US");
}

export function formatMembershipGracePeriodLabel(
  graceDays = DEFAULT_MEMBERSHIP_GRACE_DAYS
) {
  return graceDays === 1 ? "1 day" : `${graceDays} days`;
}
