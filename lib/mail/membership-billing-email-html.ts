import { buildVendorReviewStatusEmailHtml } from "@/lib/mail/vendor-review-status-email-html";

export function buildMembershipWarningEmailHtml(input: {
  appName?: string;
  monthlyFeeLabel: string;
  gracePeriodLabel: string;
  gracePeriodEndsAt?: string | null;
}) {
  const deadline = input.gracePeriodEndsAt
    ? ` Grace period ends ${input.gracePeriodEndsAt}.`
    : "";

  return buildVendorReviewStatusEmailHtml({
    appName: input.appName,
    heading: "Membership payment failed",
    message: `Your marketplace membership (${input.monthlyFeeLabel}/month after the 3-month free trial) could not be charged. You have a ${input.gracePeriodLabel} grace period to update your card and complete payment.${deadline} If payment is not completed before the grace period ends, your shop will be suspended.`,
  });
}

export function buildMembershipSuspendedEmailHtml(input: {
  appName?: string;
  monthlyFeeLabel: string;
  gracePeriodLabel: string;
}) {
  return buildVendorReviewStatusEmailHtml({
    appName: input.appName,
    heading: "Your shop has been suspended",
    message: `Your vendor shop is hidden from customers because membership payment was not completed within the ${input.gracePeriodLabel} grace period (${input.monthlyFeeLabel}/month). Update your billing card and pay outstanding membership charges to restore your shop.`,
  });
}
