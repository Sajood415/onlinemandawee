import { env } from "@/config/env";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import {
  buildMembershipSuspendedEmailHtml,
  buildMembershipWarningEmailHtml,
} from "@/lib/mail/membership-billing-email-html";
import {
  countOverdueMembershipMonths,
  formatMembershipFee,
  isMembershipBillingSuspension,
  MEMBERSHIP_SUSPEND_AFTER_OVERDUE_MONTHS,
  MEMBERSHIP_UNPAID_SUSPENSION_REASON,
  MEMBERSHIP_WARN_OVERDUE_MONTHS_MAX,
  MEMBERSHIP_WARN_OVERDUE_MONTHS_MIN,
  resolveMembershipOverdueLevel,
} from "@/lib/membership/subscription-policy";
import { MembershipInvoiceRepository } from "@/repositories/membership-invoice.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class MembershipBillingService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository()
  ) {}

  async generateMonthlyInvoices(input: { month?: string }) {
    const { periodStart, periodEnd } = this.resolvePeriod(input.month);
    const dueAt = new Date(periodStart);
    dueAt.setUTCDate(dueAt.getUTCDate() + 7);

    const billableVendors = await this.vendorProfileRepository.listForMembershipBilling();
    let createdCount = 0;
    let pendingCount = 0;
    let waivedCount = 0;

    for (const vendor of billableVendors) {
      const existing = await this.membershipInvoiceRepository.findByVendorAndPeriod({
        vendorProfileId: vendor.id,
        periodStart,
        periodEnd,
      });

      if (existing) {
        continue;
      }

      const billingAnchor = vendor.approvedAt ?? vendor.createdAt;
      const trialEndsAt = this.addDays(billingAnchor, env.MEMBERSHIP_TRIAL_DAYS);
      const isInTrial = periodStart < trialEndsAt;

      await this.membershipInvoiceRepository.create({
        vendorProfileId: vendor.id,
        periodStart,
        periodEnd,
        dueAt,
        amount: isInTrial ? 0 : env.MEMBERSHIP_FEE_AMOUNT,
        currency: env.MEMBERSHIP_INVOICE_CURRENCY,
        status: isInTrial ? "WAIVED" : "PENDING",
        waivedReason: isInTrial ? "Vendor is within membership trial period" : null,
      });

      createdCount += 1;
      if (isInTrial) {
        waivedCount += 1;
      } else {
        pendingCount += 1;
      }
    }

    const enforcement = await this.enforceSubscriptionCompliance();

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      dueAt: dueAt.toISOString(),
      membershipFeeAmount: env.MEMBERSHIP_FEE_AMOUNT,
      membershipTrialDays: env.MEMBERSHIP_TRIAL_DAYS,
      currency: env.MEMBERSHIP_INVOICE_CURRENCY,
      createdCount,
      pendingCount,
      waivedCount,
      enforcement,
    };
  }

  async enforceSubscriptionCompliance() {
    const now = new Date();
    const monthlyFeeLabel = formatMembershipFee(
      env.MEMBERSHIP_FEE_AMOUNT,
      env.MEMBERSHIP_INVOICE_CURRENCY
    );
    const vendors = await this.vendorProfileRepository.listForMembershipBilling();

    let warnedCount = 0;
    let suspendedCount = 0;
    let reactivatedCount = 0;

    for (const vendor of vendors) {
      const invoices = await this.membershipInvoiceRepository.listByVendorProfileId(
        vendor.id
      );
      const overdueMonths = countOverdueMembershipMonths(invoices, now);
      const level = resolveMembershipOverdueLevel(overdueMonths);

      if (overdueMonths >= MEMBERSHIP_SUSPEND_AFTER_OVERDUE_MONTHS) {
        if (vendor.status === "ACTIVE") {
          await this.vendorProfileRepository.updateStep({
            vendorProfileId: vendor.id,
            onboardingStep: vendor.onboardingStep,
            status: "SUSPENDED",
            suspendedAt: now,
            suspensionReason: MEMBERSHIP_UNPAID_SUSPENSION_REASON,
          });
          suspendedCount += 1;
          await this.sendSuspendedEmail(vendor.user.email, monthlyFeeLabel);
        }
        continue;
      }

      if (
        vendor.status === "SUSPENDED" &&
        isMembershipBillingSuspension(vendor.suspensionReason)
      ) {
        await this.vendorProfileRepository.updateStep({
          vendorProfileId: vendor.id,
          onboardingStep: vendor.onboardingStep,
          status: "ACTIVE",
          suspendedAt: null,
          suspensionReason: null,
        });
        reactivatedCount += 1;
      }

      if (
        overdueMonths >= MEMBERSHIP_WARN_OVERDUE_MONTHS_MIN &&
        overdueMonths <= MEMBERSHIP_WARN_OVERDUE_MONTHS_MAX
      ) {
        await this.sendWarningEmail(
          vendor.user.email,
          overdueMonths,
          monthlyFeeLabel
        );
        warnedCount += 1;
      }
    }

    return {
      warnedCount,
      suspendedCount,
      reactivatedCount,
      suspendAfterOverdueMonths: MEMBERSHIP_SUSPEND_AFTER_OVERDUE_MONTHS,
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
    await this.enforceSubscriptionCompliance();
    return paid;
  }

  async getVendorSubscriptionStatus(vendorProfileId: string) {
    const vendor = await this.vendorProfileRepository.findById(vendorProfileId);
    if (!vendor) {
      return null;
    }

    const invoices = await this.membershipInvoiceRepository.listByVendorProfileId(
      vendorProfileId
    );
    const now = new Date();
    const billingAnchor = vendor.approvedAt ?? vendor.createdAt;
    const trialEndsAt = this.addDays(billingAnchor, env.MEMBERSHIP_TRIAL_DAYS);
    const overdueMonths = countOverdueMembershipMonths(invoices, now);
    const level = resolveMembershipOverdueLevel(overdueMonths);
    const latestInvoice = invoices[0] ?? null;

    return {
      monthlyAmount: env.MEMBERSHIP_FEE_AMOUNT,
      currency: env.MEMBERSHIP_INVOICE_CURRENCY,
      trialEndsAt: trialEndsAt.toISOString(),
      isInTrial: now < trialEndsAt,
      overdueMonths,
      alertLevel: level,
      shopSuspendedForBilling:
        vendor.status === "SUSPENDED" &&
        isMembershipBillingSuspension(vendor.suspensionReason),
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

  private async sendWarningEmail(
    to: string,
    overdueMonths: number,
    monthlyFeeLabel: string
  ) {
    const monthsLabel =
      overdueMonths === 1 ? "1 month" : `${overdueMonths} months`;

    await sendTransactionalEmail({
      to,
      subject: `${env.APP_NAME} — membership payment overdue`,
      text: `Your marketplace membership (${monthlyFeeLabel}/month) is overdue for ${monthsLabel}. Pay outstanding invoices to avoid shop suspension after 4 months without payment.`,
      html: buildMembershipWarningEmailHtml({
        appName: env.APP_NAME,
        overdueMonths,
        monthlyFeeLabel,
      }),
    });
  }

  private async sendSuspendedEmail(to: string, monthlyFeeLabel: string) {
    await sendTransactionalEmail({
      to,
      subject: `${env.APP_NAME} — vendor shop suspended (unpaid membership)`,
      text: `Your vendor shop is hidden because membership invoices are 4+ months overdue (${monthlyFeeLabel}/month). Pay all outstanding membership charges to restore your shop.`,
      html: buildMembershipSuspendedEmailHtml({
        appName: env.APP_NAME,
        monthlyFeeLabel,
      }),
    });
  }

  private resolvePeriod(month?: string) {
    if (month) {
      const [year, monthValue] = month.split("-").map(Number);
      const periodStart = new Date(Date.UTC(year, monthValue - 1, 1, 0, 0, 0, 0));
      const periodEnd = new Date(Date.UTC(year, monthValue, 0, 23, 59, 59, 999));
      return { periodStart, periodEnd };
    }

    const now = new Date();
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
    );
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    );
    return { periodStart, periodEnd };
  }

  private addDays(value: Date, days: number) {
    const result = new Date(value);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }
}
