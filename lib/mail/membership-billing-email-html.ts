import { buildVendorReviewStatusEmailHtml } from "@/lib/mail/vendor-review-status-email-html";

export function buildMembershipWarningEmailHtml(input: {
  appName?: string;
  overdueMonths: number;
  monthlyFeeLabel: string;
}) {
  const monthsLabel =
    input.overdueMonths === 1 ? "1 month" : `${input.overdueMonths} months`;

  return buildVendorReviewStatusEmailHtml({
    appName: input.appName,
    heading: "Membership payment overdue",
    message: `Your marketplace membership (${input.monthlyFeeLabel}/month after the 3-month free trial) is overdue for ${monthsLabel}. Please pay outstanding invoices to keep your shop active. Your shop will be suspended after 4 months without payment.`,
  });
}

export function buildMembershipSuspendedEmailHtml(input: {
  appName?: string;
  monthlyFeeLabel: string;
}) {
  return buildVendorReviewStatusEmailHtml({
    appName: input.appName,
    heading: "Your shop has been suspended",
    message: `Your vendor shop is hidden from customers because membership invoices are 4+ months overdue (${input.monthlyFeeLabel}/month). Pay all outstanding membership charges to restore your shop.`,
  });
}
