import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  formatPeriodLabel,
  getPeriodKey,
  type SalesSummaryGranularity,
} from "@/lib/reports/period-bucket";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import { MembershipInvoiceRepository } from "@/repositories/membership-invoice.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { OrderSettlementService } from "@/services/order-settlement.service";

type ReportRange = {
  from?: Date;
  to?: Date;
};

type SalesSummaryBucket = {
  periodKey: string;
  periodLabel: string;
  orderCount: number;
  itemsSold: number;
  subtotalAmount: number;
  deliveryAmount: number;
  grossSalesAmount: number;
  commissionAmount: number;
  netEarningsAmount: number;
};

type SalesSummaryTotals = Omit<SalesSummaryBucket, "periodKey" | "periodLabel">;

export class VendorReportService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository(),
    private readonly payoutRepository = new PayoutRepository(),
    private readonly orderSettlementService = new OrderSettlementService()
  ) {}

  async salesSummary(
    auth: AuthenticatedUser,
    range: ReportRange & { granularity: SalesSummaryGranularity }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    const { from, to, granularity } = range;

    const [vendorOrders, commissionEntries] = await Promise.all([
      this.orderRepository.listByVendorProfileId(vendor.id),
      this.commissionLedgerRepository.listByVendorProfileId(vendor.id),
    ]);

    const commissionByOrderVendorId = new Map(
      commissionEntries.map((entry) => [entry.orderVendorId, entry])
    );

    const settledOrders = vendorOrders.filter(
      (vendorOrder) =>
        this.isWithinRange(vendorOrder.createdAt, { from, to }) &&
        this.isReportableVendorOrder(vendorOrder, commissionByOrderVendorId)
    );

    const bucketMap = new Map<string, SalesSummaryBucket>();

    for (const vendorOrder of settledOrders) {
      const periodKey = getPeriodKey(vendorOrder.createdAt, granularity);
      const commission = commissionByOrderVendorId.get(vendorOrder.id);
      const commissionAmount = commission?.commissionAmount ?? 0;
      const itemsSold = vendorOrder.items.reduce((sum, item) => sum + item.quantity, 0);

      const existing = bucketMap.get(periodKey) ?? {
        periodKey,
        periodLabel: formatPeriodLabel(periodKey, granularity),
        orderCount: 0,
        itemsSold: 0,
        subtotalAmount: 0,
        deliveryAmount: 0,
        grossSalesAmount: 0,
        commissionAmount: 0,
        netEarningsAmount: 0,
      };

      existing.orderCount += 1;
      existing.itemsSold += itemsSold;
      existing.subtotalAmount += vendorOrder.subtotalAmount;
      existing.deliveryAmount += vendorOrder.deliveryAmount;
      existing.grossSalesAmount += vendorOrder.grandTotalAmount;
      existing.commissionAmount += commissionAmount;
      existing.netEarningsAmount += vendorOrder.grandTotalAmount - commissionAmount;

      bucketMap.set(periodKey, existing);
    }

    const periods = [...bucketMap.values()].sort((a, b) =>
      b.periodKey.localeCompare(a.periodKey)
    );

    const totals = periods.reduce<SalesSummaryTotals>(
      (acc, period) => ({
        orderCount: acc.orderCount + period.orderCount,
        itemsSold: acc.itemsSold + period.itemsSold,
        subtotalAmount: acc.subtotalAmount + period.subtotalAmount,
        deliveryAmount: acc.deliveryAmount + period.deliveryAmount,
        grossSalesAmount: acc.grossSalesAmount + period.grossSalesAmount,
        commissionAmount: acc.commissionAmount + period.commissionAmount,
        netEarningsAmount: acc.netEarningsAmount + period.netEarningsAmount,
      }),
      {
        orderCount: 0,
        itemsSold: 0,
        subtotalAmount: 0,
        deliveryAmount: 0,
        grossSalesAmount: 0,
        commissionAmount: 0,
        netEarningsAmount: 0,
      }
    );

    return {
      vendorProfileId: vendor.id,
      currency: settledOrders[0]?.currency ?? "USD",
      granularity,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      totals,
      periods,
    };
  }

  async sales(auth: AuthenticatedUser, range: ReportRange) {
    const vendor = await this.requireActiveVendor(auth.id);
    const commissionEntries =
      await this.commissionLedgerRepository.listByVendorProfileId(vendor.id);
    const commissionByOrderVendorId = new Map(
      commissionEntries.map((entry) => [entry.orderVendorId, entry])
    );
    const vendorOrders = (
      await this.orderRepository.listByVendorProfileId(vendor.id)
    ).filter(
      (vendorOrder) =>
        this.isWithinRange(vendorOrder.createdAt, range) &&
        this.isReportableVendorOrder(vendorOrder, commissionByOrderVendorId)
    );

    return {
      vendorProfileId: vendor.id,
      totalOrders: vendorOrders.length,
      totalItemsSold: vendorOrders.reduce(
        (sum, vendorOrder) =>
          sum +
          vendorOrder.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      ),
      subtotalAmount: vendorOrders.reduce(
        (sum, vendorOrder) => sum + vendorOrder.subtotalAmount,
        0
      ),
      deliveryAmount: vendorOrders.reduce(
        (sum, vendorOrder) => sum + vendorOrder.deliveryAmount,
        0
      ),
      grandTotalAmount: vendorOrders.reduce(
        (sum, vendorOrder) => sum + vendorOrder.grandTotalAmount,
        0
      ),
      statusBreakdown: {
        NEW: vendorOrders.filter((item) => item.status === "NEW").length,
        PREPARING: vendorOrders.filter((item) => item.status === "PREPARING").length,
        SHIPPED: vendorOrders.filter((item) => item.status === "SHIPPED").length,
        DELIVERED: vendorOrders.filter((item) => item.status === "DELIVERED").length,
        CANCELLED: vendorOrders.filter((item) => item.status === "CANCELLED").length,
      },
      recentOrders: vendorOrders.slice(0, 20).map((vendorOrder) => ({
        id: vendorOrder.id,
        orderId: vendorOrder.orderId,
        orderNumber: vendorOrder.order.orderNumber,
        status: vendorOrder.status,
        currency: vendorOrder.currency,
        subtotalAmount: vendorOrder.subtotalAmount,
        deliveryAmount: vendorOrder.deliveryAmount,
        grandTotalAmount: vendorOrder.grandTotalAmount,
        createdAt: vendorOrder.createdAt.toISOString(),
      })),
    };
  }

  async feeSubscriptionHistory(auth: AuthenticatedUser, range: ReportRange) {
    const vendor = await this.requireActiveVendor(auth.id);

    const [commissionEntries, membershipInvoices, vendorOrders] = await Promise.all([
      this.commissionLedgerRepository.listByVendorProfileId(vendor.id),
      this.membershipInvoiceRepository.listByVendorProfileId(vendor.id),
      this.orderRepository.listByVendorProfileId(vendor.id),
    ]);

    const orderNumberByOrderId = new Map(
      vendorOrders.map((vendorOrder) => [vendorOrder.orderId, vendorOrder.order.orderNumber])
    );

    const orderFees = commissionEntries
      .filter((entry) => this.isWithinRange(entry.createdAt, range))
      .map((entry) => ({
        id: entry.id,
        orderId: entry.orderId,
        orderNumber: orderNumberByOrderId.get(entry.orderId) ?? null,
        orderVendorId: entry.orderVendorId,
        baseAmount: entry.baseAmount,
        rateBps: entry.rateBps,
        amount: entry.commissionAmount,
        currency: entry.currency,
        deductedAt: entry.createdAt.toISOString(),
      }))
      .sort(
        (a, b) => new Date(b.deductedAt).getTime() - new Date(a.deductedAt).getTime()
      );

    const subscriptionCharges = membershipInvoices
      .filter((invoice) => this.isWithinRange(invoice.periodStart, range))
      .map((invoice) => ({
        id: invoice.id,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        periodLabel: this.formatMembershipPeriod(invoice.periodStart),
        dueAt: invoice.dueAt.toISOString(),
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        attemptedAt: invoice.attemptedAt?.toISOString() ?? null,
        stripeInvoiceId: invoice.stripeInvoiceId ?? null,
        stripePaymentId: invoice.stripePaymentId ?? null,
        failureReason: invoice.failureReason ?? null,
        waivedReason: invoice.waivedReason,
        chargedAmount:
          invoice.status === "PAID"
            ? invoice.amount
            : invoice.status === "WAIVED" || invoice.status === "VOID"
              ? 0
              : null,
      }));

    const totalOrderFees = orderFees.reduce((sum, entry) => sum + entry.amount, 0);
    const totalSubscriptionCharged = subscriptionCharges.reduce(
      (sum, invoice) => sum + (invoice.chargedAmount ?? 0),
      0
    );

    return {
      vendorProfileId: vendor.id,
      from: range.from?.toISOString() ?? null,
      to: range.to?.toISOString() ?? null,
      rates: {
        commissionRateBps: env.COMMISSION_RATE_BPS,
        commissionRatePercent: env.COMMISSION_RATE_BPS / 100,
        membershipFeeAmount: env.MEMBERSHIP_FEE_AMOUNT,
        membershipCurrency: env.MEMBERSHIP_INVOICE_CURRENCY,
        membershipTrialDays: env.MEMBERSHIP_TRIAL_DAYS,
      },
      totals: {
        orderFeeCount: orderFees.length,
        totalOrderFees,
        subscriptionInvoiceCount: subscriptionCharges.length,
        totalSubscriptionCharged,
        totalFees: totalOrderFees + totalSubscriptionCharged,
      },
      orderFees,
      subscriptionCharges,
    };
  }

  async commission(auth: AuthenticatedUser, range: ReportRange) {
    const vendor = await this.requireActiveVendor(auth.id);
    const entries = (
      await this.commissionLedgerRepository.listByVendorProfileId(vendor.id)
    ).filter((entry) => this.isWithinRange(entry.createdAt, range));

    return {
      vendorProfileId: vendor.id,
      totalBaseAmount: entries.reduce((sum, entry) => sum + entry.baseAmount, 0),
      totalCommissionAmount: entries.reduce(
        (sum, entry) => sum + entry.commissionAmount,
        0
      ),
      netAmountAfterCommission: entries.reduce(
        (sum, entry) => sum + (entry.baseAmount - entry.commissionAmount),
        0
      ),
      entries: entries.slice(0, 50).map((entry) => ({
        id: entry.id,
        orderId: entry.orderId,
        orderVendorId: entry.orderVendorId,
        rateBps: entry.rateBps,
        baseAmount: entry.baseAmount,
        commissionAmount: entry.commissionAmount,
        currency: entry.currency,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async payouts(auth: AuthenticatedUser, range: ReportRange) {
    const vendor = await this.requireActiveVendor(auth.id);

    const [payouts, vendorOrders] = await Promise.all([
      this.payoutRepository.listByVendorProfileId(vendor.id),
      this.orderRepository.listByVendorProfileId(vendor.id),
    ]);

    const orderRefByVendorOrderId = new Map(
      vendorOrders.map((vendorOrder) => [
        vendorOrder.id,
        {
          orderId: vendorOrder.orderId,
          orderNumber: vendorOrder.order.orderNumber,
        },
      ])
    );

    const inRange = (payout: (typeof payouts)[number]) => {
      const referenceDate = payout.sentAt ?? payout.releasedAt ?? payout.createdAt;
      return this.isWithinRange(referenceDate, range);
    };

    const items = payouts.filter(inRange).map((payout) => {
      const orderRef = orderRefByVendorOrderId.get(payout.orderVendorId);
      return {
        id: payout.id,
        orderVendorId: payout.orderVendorId,
        orderId: orderRef?.orderId ?? null,
        orderNumber: orderRef?.orderNumber ?? null,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        holdUntil: payout.holdUntil.toISOString(),
        releasedAt: payout.releasedAt?.toISOString() ?? null,
        sentAt: payout.sentAt?.toISOString() ?? null,
        failureReason: payout.failureReason,
        createdAt: payout.createdAt.toISOString(),
      };
    });

    const sentItems = items.filter((item) => item.status === "SENT");

    return {
      vendorProfileId: vendor.id,
      currency: items[0]?.currency ?? "USD",
      from: range.from?.toISOString() ?? null,
      to: range.to?.toISOString() ?? null,
      totals: {
        totalPayouts: items.length,
        totalAmount: items.reduce((sum, payout) => sum + payout.amount, 0),
        sentCount: sentItems.length,
        sentAmount: sentItems.reduce((sum, payout) => sum + payout.amount, 0),
      },
      byStatus: {
        ON_HOLD: items.filter((item) => item.status === "ON_HOLD").length,
        READY: items.filter((item) => item.status === "READY").length,
        SENT: sentItems.length,
        FAILED: items.filter((item) => item.status === "FAILED").length,
      },
      payouts: items,
    };
  }

  private async requireActiveVendor(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    if (vendor.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active vendors can access reports",
        statusCode: 403,
      });
    }

    await this.orderSettlementService.reconcileUnsettledDeliveredOrders(vendor.id);

    return vendor;
  }

  private isReportableVendorOrder(
    vendorOrder: { id: string; order: { paymentStatus: string } },
    commissionByOrderVendorId: Map<string, unknown>
  ) {
    return (
      this.isSettledPayment(vendorOrder.order.paymentStatus) ||
      commissionByOrderVendorId.has(vendorOrder.id)
    );
  }

  private isWithinRange(value: Date, range: ReportRange) {
    if (range.from && value < range.from) {
      return false;
    }

    if (range.to && value > range.to) {
      return false;
    }

    return true;
  }

  private isSettledPayment(status: string) {
    return (
      status === "PAID" ||
      status === "PARTIALLY_REFUNDED" ||
      status === "REFUNDED"
    );
  }

  private formatMembershipPeriod(periodStart: Date) {
    return periodStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
}
