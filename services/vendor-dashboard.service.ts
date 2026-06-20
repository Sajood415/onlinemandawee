import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { formatFlatTransactionFeeLabel } from "@/lib/platform/transaction-fee";
import { MembershipInvoiceRepository } from "@/repositories/membership-invoice.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { PlatformSettingsRepository } from "@/repositories/platform-settings.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import { OrderSettlementService } from "@/services/order-settlement.service";

export class VendorDashboardService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly productRepository = new ProductRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly platformSettingsRepository = new PlatformSettingsRepository(),
    private readonly orderSettlementService = new OrderSettlementService()
  ) {}

  async getSummary(auth: AuthenticatedUser) {
    const vendor = await this.vendorProfileRepository.findByUserId(auth.id);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    await this.orderSettlementService.reconcileUnsettledDeliveredOrders(vendor.id);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [vendorOrders, products, ledgerEntries, membershipInvoices, commissions, platformSettings] =
      await Promise.all([
        this.orderRepository.listByVendorProfileId(vendor.id),
        this.productRepository.listByVendor(vendor.id),
        this.vendorLedgerEntryRepository.listByVendorProfileId(vendor.id),
        this.membershipInvoiceRepository.listByVendorProfileId(vendor.id),
        this.commissionLedgerRepository.listByVendorProfileId(vendor.id),
        this.platformSettingsRepository.getOrCreate(),
      ]);

    const commissionedOrderVendorIds = new Set(
      commissions.map((entry) => entry.orderVendorId)
    );

    const isReportableOrder = (order: (typeof vendorOrders)[number]) =>
      this.isSettledPayment(order.order.paymentStatus) ||
      commissionedOrderVendorIds.has(order.id);

    const totalOrders = vendorOrders.length;

    const recentOrders = vendorOrders.filter(
      (o) => new Date(o.createdAt) >= thirtyDaysAgo && isReportableOrder(o)
    );
    const recentSalesAmount = recentOrders.reduce(
      (sum, o) => sum + o.grandTotalAmount,
      0
    );
    const recentSalesCurrency = vendorOrders[0]?.currency ?? "USD";

    const holdBalance = ledgerEntries
      .filter((e) => e.bucket === "HOLD")
      .reduce((sum, e) => sum + e.amount, 0);
    const availableBalance = ledgerEntries
      .filter((e) => e.bucket === "AVAILABLE")
      .reduce((sum, e) => sum + e.amount, 0);
    const netEarnings = holdBalance + availableBalance;
    const earningsCurrency = ledgerEntries[0]?.currency ?? "USD";

    const latestInvoice = membershipInvoices[0] ?? null;
    const overdueMonths = vendor.subscriptionStatus === "FAILED" ? 1 : 0;
    const billingAlertLevel =
      vendor.subscriptionStatus === "FAILED"
        ? "critical"
        : vendor.subscriptionStatus === "SUSPENDED"
          ? "suspended"
          : "none";

    const pendingApprovals = products.filter(
      (p) => p.approvalStatus === "PENDING_APPROVAL"
    ).length;

    const totalProducts = products.length;
    const activeProducts = products.filter(
      (p) => p.approvalStatus === "APPROVED"
    ).length;

    return {
      storeName: vendor.storeName ?? null,
      storeSlug: vendor.storeSlug ?? null,
      vendorStatus: vendor.status,
      totalOrders,
      recentSales: {
        amount: recentSalesAmount,
        currency: recentSalesCurrency,
        periodDays: 30,
        orderCount: recentOrders.length,
      },
      netEarnings: {
        amount: netEarnings,
        currency: earningsCurrency,
        holdBalance,
        availableBalance,
      },
      subscription: {
        status: vendor.subscriptionStatus,
        monthlyAmount: env.MEMBERSHIP_FEE_AMOUNT,
        currency: env.MEMBERSHIP_INVOICE_CURRENCY,
        trialEndsAt: vendor.subscriptionTrialEndsAt?.toISOString() ?? null,
        isInTrial: vendor.subscriptionStatus === "TRIAL",
        overdueMonths,
        alertLevel: billingAlertLevel,
        gracePeriodEndsAt: vendor.subscriptionGracePeriodEndsAt?.toISOString() ?? null,
        failedPaymentCount: vendor.subscriptionFailedPaymentCount,
        shopSuspendedForBilling: vendor.subscriptionStatus === "SUSPENDED",
        latestInvoiceDueAt: latestInvoice ? latestInvoice.dueAt?.toISOString() ?? null : null,
        latestInvoicePeriodStart: latestInvoice
          ? latestInvoice.periodStart?.toISOString() ?? null
          : null,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        pendingApprovals,
      },
      feeEarnings: this.buildFeeEarningsBoard(
        vendorOrders,
        commissions,
        membershipInvoices,
        platformSettings.transactionFeeAmountMinor
      ),
    };
  }

  private buildFeeEarningsBoard(
    vendorOrders: Awaited<ReturnType<OrderRepository["listByVendorProfileId"]>>,
    commissions: Awaited<
      ReturnType<CommissionLedgerRepository["listByVendorProfileId"]>
    >,
    membershipInvoices: Awaited<
      ReturnType<MembershipInvoiceRepository["listByVendorProfileId"]>
    >,
    transactionFeeAmountMinor: number
  ) {
    const commissionByOrderVendorId = new Map(
      commissions.map((entry) => [entry.orderVendorId, entry])
    );
    const currency = vendorOrders[0]?.currency ?? "USD";

    const orders = vendorOrders.slice(0, 50).map((vendorOrder) => {
      const commission = commissionByOrderVendorId.get(vendorOrder.id);
      const transactionFee = commission?.commissionAmount ?? null;
      const netEarnings =
        commission != null
          ? vendorOrder.grandTotalAmount - commission.commissionAmount
          : null;

      return {
        id: vendorOrder.id,
        orderNumber: vendorOrder.order.orderNumber,
        vendorOrderStatus: vendorOrder.status,
        paymentStatus: vendorOrder.order.paymentStatus,
        orderTotal: vendorOrder.grandTotalAmount,
        transactionFee,
        netEarnings,
        currency: vendorOrder.currency,
        isSettled: commission != null,
        createdAt: vendorOrder.createdAt.toISOString(),
      };
    });

    const settledOrders = orders.filter((order) => order.isSettled);
    const latestInvoice = membershipInvoices[0] ?? null;

    return {
      currency,
      transactionFeeAmountMinor,
      transactionFeeLabel: formatFlatTransactionFeeLabel(
        transactionFeeAmountMinor,
        currency
      ),
      subscription: {
        monthlyAmount: env.MEMBERSHIP_FEE_AMOUNT,
        currency: env.MEMBERSHIP_INVOICE_CURRENCY,
        status: latestInvoice?.status ?? "NO_INVOICE",
        periodLabel: latestInvoice
          ? latestInvoice.periodStart.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })
          : null,
        dueAt: latestInvoice?.dueAt.toISOString() ?? null,
        invoiceAmount: latestInvoice?.amount ?? env.MEMBERSHIP_FEE_AMOUNT,
      },
      orders,
      totals: {
        settledOrderCount: settledOrders.length,
        orderTotal: settledOrders.reduce((sum, order) => sum + order.orderTotal, 0),
        transactionFees: settledOrders.reduce(
          (sum, order) => sum + (order.transactionFee ?? 0),
          0
        ),
        netEarnings: settledOrders.reduce(
          (sum, order) => sum + (order.netEarnings ?? 0),
          0
        ),
      },
    };
  }

  private isSettledPayment(status: string) {
    return (
      status === "PAID" ||
      status === "PARTIALLY_REFUNDED" ||
      status === "REFUNDED"
    );
  }
}
