import { env } from "@/config/env";
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

    const activeVendors = await this.vendorProfileRepository.listByStatus("ACTIVE");
    let createdCount = 0;
    let pendingCount = 0;
    let waivedCount = 0;

    for (const vendor of activeVendors) {
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
    };
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
