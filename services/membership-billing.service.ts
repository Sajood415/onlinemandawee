import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import { buildMembershipSuspendedEmailHtml } from "@/lib/mail/membership-billing-email-html";
import {
  formatMembershipFee,
  formatMembershipGracePeriodLabel,
  isMembershipBillingSuspension,
  resolveMembershipBillingAlertLevel,
} from "@/lib/membership/subscription-policy";
import {
  restoreVendorBillingAccessAfterManualResolution,
  syncVendorBillingAccess,
  vendorHasPendingMembershipCharges,
} from "@/lib/membership/billing-access";
import { MembershipInvoiceRepository } from "@/repositories/membership-invoice.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class MembershipBillingService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository(),
  ) {}

  async generateMonthlyInvoices(_input: { month?: string }) {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message:
        "Manual membership invoice generation is disabled. Stripe subscription billing manages membership charges.",
      statusCode: 400,
    });
  }

  async enforceSubscriptionCompliance() {
    const now = new Date();
    const monthlyFeeLabel = formatMembershipFee(
      env.MEMBERSHIP_FEE_AMOUNT,
      env.MEMBERSHIP_INVOICE_CURRENCY
    );
    const vendors = await this.vendorProfileRepository.listForMembershipBilling();

    let suspendedCount = 0;
    let reactivatedCount = 0;
    let warnedCount = 0;

    for (const vendor of vendors) {
      const shouldSuspendForFailedGrace =
        vendor.subscriptionStatus === "FAILED" &&
        vendor.subscriptionGracePeriodEndsAt != null &&
        now >= vendor.subscriptionGracePeriodEndsAt;

      if (shouldSuspendForFailedGrace && vendor.subscriptionStatus !== "SUSPENDED") {
        await this.vendorProfileRepository.updateStep({
          vendorProfileId: vendor.id,
          onboardingStep: vendor.onboardingStep,
          subscriptionStatus: "SUSPENDED",
        });
      }

      const syncResult = await syncVendorBillingAccess(vendor.id);
      if (syncResult.action === "suspended") {
        suspendedCount += 1;
        await this.sendSuspendedEmail(vendor.user.email, monthlyFeeLabel);
      } else if (syncResult.action === "reactivated") {
        reactivatedCount += 1;
      }

      if (
        vendor.subscriptionStatus === "FAILED" &&
        vendor.subscriptionGracePeriodEndsAt != null &&
        now < vendor.subscriptionGracePeriodEndsAt
      ) {
        warnedCount += 1;
      }
    }

    return {
      warnedCount,
      suspendedCount,
      reactivatedCount,
      graceDays: env.MEMBERSHIP_GRACE_DAYS,
    };
  }

  async markInvoicePaid(invoiceId: string) {
    const invoice = await this.membershipInvoiceRepository.findById(invoiceId);
    if (!invoice) {
      return null;
    }

    if (invoice.status === "PAID") {
      return invoice;
    }

    const paid = await this.membershipInvoiceRepository.markPaid(invoiceId);
    await restoreVendorBillingAccessAfterManualResolution(invoice.vendorProfileId);
    await syncVendorBillingAccess(invoice.vendorProfileId);
    return paid;
  }

  async waiveInvoice(invoiceId: string, waivedReason?: string) {
    const invoice = await this.membershipInvoiceRepository.findById(invoiceId);
    if (!invoice) {
      return null;
    }

    if (invoice.status === "WAIVED") {
      return invoice;
    }

    const waived = await this.membershipInvoiceRepository.markWaived(
      invoiceId,
      waivedReason?.trim() || "Waived by admin"
    );

    await restoreVendorBillingAccessAfterManualResolution(invoice.vendorProfileId);
    await syncVendorBillingAccess(invoice.vendorProfileId);
    return waived;
  }

  async canReactivateFromBilling(vendorProfileId: string) {
    const vendor = await this.vendorProfileRepository.findById(vendorProfileId);
    if (!vendor) {
      return false;
    }

    if (!isMembershipBillingSuspension(vendor.suspensionReason)) {
      return true;
    }

    return !(await vendorHasPendingMembershipCharges(vendorProfileId));
  }

  async getVendorSubscriptionStatus(vendorProfileId: string) {
    const vendor = await this.vendorProfileRepository.findById(vendorProfileId);
    if (!vendor) {
      return null;
    }

    const invoices = await this.membershipInvoiceRepository.listByVendorProfileId(
      vendorProfileId
    );
    const billingAnchor = vendor.approvedAt ?? vendor.createdAt;
    const trialEndsAt = this.addDays(billingAnchor, env.MEMBERSHIP_TRIAL_DAYS);
    const level = resolveMembershipBillingAlertLevel({
      subscriptionStatus: vendor.subscriptionStatus,
      gracePeriodEndsAt: vendor.subscriptionGracePeriodEndsAt,
    });
    const latestInvoice = invoices[0] ?? null;

    return {
      monthlyAmount: env.MEMBERSHIP_FEE_AMOUNT,
      currency: env.MEMBERSHIP_INVOICE_CURRENCY,
      trialEndsAt: trialEndsAt.toISOString(),
      isInTrial: vendor.subscriptionStatus === "TRIAL",
      overdueMonths: vendor.subscriptionStatus === "FAILED" ? 1 : 0,
      alertLevel: level,
      shopSuspendedForBilling: vendor.subscriptionStatus === "SUSPENDED",
      gracePeriodEndsAt: vendor.subscriptionGracePeriodEndsAt?.toISOString() ?? null,
      failedPaymentCount: vendor.subscriptionFailedPaymentCount,
      latestInvoice: latestInvoice
        ? {
            status: latestInvoice.status,
            amount: latestInvoice.amount,
            dueAt: latestInvoice.dueAt.toISOString(),
            periodStart: latestInvoice.periodStart.toISOString(),
          }
        : null,
    };
  }

  private async sendSuspendedEmail(to: string, monthlyFeeLabel: string) {
    const graceLabel = formatMembershipGracePeriodLabel();
    await sendTransactionalEmail({
      to,
      subject: `${env.APP_NAME} — vendor shop suspended (unpaid membership)`,
      text: `Your vendor shop is hidden because membership payment was not completed within the ${graceLabel} grace period (${monthlyFeeLabel}/month). Update your billing card and pay outstanding membership charges to restore your shop.`,
      html: buildMembershipSuspendedEmailHtml({
        appName: env.APP_NAME,
        monthlyFeeLabel,
        gracePeriodLabel: graceLabel,
      }),
    });
  }

  private addDays(value: Date, days: number) {
    const result = new Date(value);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }
}
