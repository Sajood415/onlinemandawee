import { env } from "@/config/env";
import { prisma } from "@/lib/db/prisma";
import { CategoryRepository } from "@/repositories/category.repository";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import { GiftRequestRepository } from "@/repositories/gift-request.repository";
import { MembershipInvoiceRepository } from "@/repositories/membership-invoice.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { RefundCaseRepository } from "@/repositories/refund-case.repository";
import { UserRepository } from "@/repositories/user.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

type ReportRange = {
  from?: Date;
  to?: Date;
};

type CategorySalesBucket = {
  salesAmount: number;
  unitsSold: number;
  lineCount: number;
  orderIds: Set<string>;
};

export class AdminReportService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly payoutRepository = new PayoutRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository(),
    private readonly refundCaseRepository = new RefundCaseRepository(),
    private readonly giftRequestRepository = new GiftRequestRepository(),
    private readonly categoryRepository = new CategoryRepository()
  ) {}

  async overview(range: ReportRange) {
    const signupRange = this.resolveSignupRange(range);
    const [
      customersCount,
      newCustomerSignupsCount,
      vendors,
    ] = await Promise.all([
      this.userRepository.countByRole("CUSTOMER"),
      this.userRepository.countCreatedInRange({
        role: "CUSTOMER",
        from: signupRange.from,
        to: signupRange.to,
      }),
      this.vendorProfileRepository.listByStatus(),
    ]);
    const orders = (await this.orderRepository.listAll()).filter((order) =>
      this.isWithinRange(order.createdAt, range)
    );
    const settledOrders = orders.filter((order) =>
      this.isSettledPayment(order.paymentStatus)
    );
    const commissions = (await this.commissionLedgerRepository.listAll()).filter(
      (entry) => this.isWithinRange(entry.createdAt, range)
    );
    const allPayouts = await this.payoutRepository.listAll();
    const payouts = allPayouts.filter((payout) =>
      this.isWithinRange(payout.createdAt, range)
    );
    const membershipInvoices = (await this.membershipInvoiceRepository.listAll()).filter(
      (invoice) => this.isWithinRange(invoice.createdAt, range)
    );
    const allRefundCases = await this.refundCaseRepository.listAll();
    const paidGiftRequests = (await this.giftRequestRepository.listPaidForReporting()).filter(
      (giftRequest) => giftRequest.paidAt && this.isWithinRange(giftRequest.paidAt, range)
    );
    const totalCommissionAmount = commissions.reduce(
      (sum, entry) => sum + entry.commissionAmount,
      0
    );
    const totalSubscriptionRevenue = membershipInvoices
      .filter((invoice) => invoice.status === "PAID")
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalGiftRequestRevenue = paidGiftRequests.reduce(
      (sum, giftRequest) => sum + (giftRequest.paidAmountMinor ?? 0),
      0
    );
    const netRevenueAmount =
      totalCommissionAmount + totalSubscriptionRevenue + totalGiftRequestRevenue;

    return {
      customersCount,
      newCustomerSignupsCount,
      signupPeriodFrom: signupRange.from.toISOString(),
      signupPeriodTo: signupRange.to.toISOString(),
      vendorsCount: vendors.length,
      activeVendorsCount: vendors.filter((vendor) => vendor.status === "ACTIVE").length,
      pendingVendorsCount: vendors.filter((vendor) => vendor.status === "PENDING_APPROVAL").length,
      ordersCount: orders.length,
      paidOrdersCount: settledOrders.length,
      grossMerchandiseValue: settledOrders.reduce(
        (sum, order) => sum + order.grandTotalAmount,
        0
      ),
      totalCommissionAmount,
      totalSubscriptionRevenue,
      totalGiftRequestRevenue,
      paidGiftRequestsCount: paidGiftRequests.length,
      netRevenueAmount,
      payoutsOnHoldAmount: allPayouts
        .filter((payout) => payout.status === "ON_HOLD")
        .reduce((sum, payout) => sum + payout.amount, 0),
      payoutsSentAmount: payouts
        .filter((payout) => payout.status === "SENT")
        .reduce((sum, payout) => sum + payout.amount, 0),
      recentOrdersCount: orders.length,
      openRefundCasesCount: allRefundCases.filter(
        (refundCase) => refundCase.status !== "RESOLVED"
      ).length,
    };
  }

  async vendors(range: ReportRange) {
    const vendors = await this.vendorProfileRepository.listByStatus();
    const vendorOrders = (await Promise.all(
      vendors.map((vendor) => this.orderRepository.listByVendorProfileId(vendor.id))
    )).flat();
    const commissions = await this.commissionLedgerRepository.listAll();
    const payouts = await this.payoutRepository.listAll();
    const membershipInvoices = await this.membershipInvoiceRepository.listAll();
    type MembershipInvoiceEntry = (typeof membershipInvoices)[number];

    return vendors.map((vendor) => {
      const vendorOrdersInRange = vendorOrders.filter(
        (vendorOrder) =>
          vendorOrder.vendorProfileId === vendor.id &&
          this.isWithinRange(vendorOrder.createdAt, range) &&
          this.isSettledPayment(vendorOrder.order.paymentStatus)
      );
      const vendorCommissions = commissions.filter(
        (entry) =>
          entry.vendorProfileId === vendor.id &&
          this.isWithinRange(entry.createdAt, range)
      );
      const vendorPayouts = payouts.filter(
        (payout) =>
          payout.vendorProfileId === vendor.id &&
          this.isWithinRange(payout.createdAt, range)
      );
      const vendorInvoices = membershipInvoices.filter(
        (invoice: MembershipInvoiceEntry) =>
          invoice.vendorProfileId === vendor.id &&
          this.isWithinRange(invoice.createdAt, range)
      );

      return {
        vendorProfileId: vendor.id,
        storeName: vendor.storeName,
        storeSlug: vendor.storeSlug,
        vendorStatus: vendor.status,
        approvedAt: vendor.approvedAt?.toISOString() ?? null,
        orderCount: vendorOrdersInRange.length,
        salesAmount: vendorOrdersInRange.reduce(
          (sum, vendorOrder) => sum + vendorOrder.grandTotalAmount,
          0
        ),
        commissionAmount: vendorCommissions.reduce(
          (sum, entry) => sum + entry.commissionAmount,
          0
        ),
        payoutAmount: vendorPayouts.reduce((sum, payout) => sum + payout.amount, 0),
        membershipPendingInvoices: vendorInvoices.filter(
          (invoice: MembershipInvoiceEntry) => invoice.status === "PENDING"
        ).length,
        membershipPaidInvoices: vendorInvoices.filter(
          (invoice: MembershipInvoiceEntry) => invoice.status === "PAID"
        ).length,
        membershipWaivedInvoices: vendorInvoices.filter(
          (invoice: MembershipInvoiceEntry) => invoice.status === "WAIVED"
        ).length,
      };
    });
  }

  async orders(range: ReportRange) {
    const orders = (await this.orderRepository.listAll()).filter((order) =>
      this.isWithinRange(order.createdAt, range)
    );
    const settledOrders = orders.filter((order) =>
      this.isSettledPayment(order.paymentStatus)
    );

    return {
      totalOrders: orders.length,
      totalAmount: settledOrders.reduce((sum, order) => sum + order.grandTotalAmount, 0),
      byOrderStatus: {
        CREATED: orders.filter((order) => order.status === "CREATED").length,
        PAID: orders.filter((order) => order.status === "PAID").length,
        PARTIALLY_FULFILLED: orders.filter(
          (order) => order.status === "PARTIALLY_FULFILLED"
        ).length,
        FULFILLED: orders.filter((order) => order.status === "FULFILLED").length,
        COMPLETED: orders.filter((order) => order.status === "COMPLETED").length,
        CANCELLED: orders.filter((order) => order.status === "CANCELLED").length,
      },
      byPaymentStatus: {
        UNPAID: orders.filter((order) => order.paymentStatus === "UNPAID").length,
        PENDING: orders.filter((order) => order.paymentStatus === "PENDING").length,
        PAID: orders.filter((order) => order.paymentStatus === "PAID").length,
        FAILED: orders.filter((order) => order.paymentStatus === "FAILED").length,
        REFUNDED: orders.filter((order) => order.paymentStatus === "REFUNDED").length,
        PARTIALLY_REFUNDED: orders.filter(
          (order) => order.paymentStatus === "PARTIALLY_REFUNDED"
        ).length,
      },
      recentOrders: orders.slice(0, 30).map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        currency: order.currency,
        grandTotalAmount: order.grandTotalAmount,
        createdAt: order.createdAt.toISOString(),
      })),
    };
  }

  async salesByCategory(range: ReportRange) {
    const createdAtFilter =
      range.from || range.to
        ? {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          }
        : undefined;

    const [orders, categories] = await Promise.all([
      prisma.order.findMany({
        where: {
          paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
          status: { not: "CANCELLED" },
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        },
        select: {
          id: true,
          currency: true,
          createdAt: true,
          vendorOrders: {
            select: {
              items: {
                select: {
                  categoryId: true,
                  quantity: true,
                  lineTotalAmount: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.categoryRepository.listAll(),
    ]);

    const categoryById = new Map(
      categories.map((category) => [category.id, category] as const)
    );

    const resolveRootCategoryId = (categoryId: string): string => {
      let currentId = categoryId;
      const seen = new Set<string>();
      while (true) {
        if (seen.has(currentId)) return currentId;
        seen.add(currentId);
        const category = categoryById.get(currentId);
        if (!category?.parentId) return currentId;
        currentId = category.parentId;
      }
    };

    const emptyBucket = (): CategorySalesBucket => ({
      salesAmount: 0,
      unitsSold: 0,
      lineCount: 0,
      orderIds: new Set<string>(),
    });

    const byCategoryId = new Map<string, CategorySalesBucket>();
    const byTopLevelId = new Map<string, CategorySalesBucket>();
    const currencyCounts = new Map<string, number>();
    let totalSalesAmount = 0;
    let totalUnitsSold = 0;
    let totalLineCount = 0;
    const allOrderIds = new Set<string>();

    for (const order of orders) {
      currencyCounts.set(
        order.currency,
        (currencyCounts.get(order.currency) ?? 0) + 1
      );

      for (const vendorOrder of order.vendorOrders) {
        for (const item of vendorOrder.items) {
          const direct =
            byCategoryId.get(item.categoryId) ?? emptyBucket();
          direct.salesAmount += item.lineTotalAmount;
          direct.unitsSold += item.quantity;
          direct.lineCount += 1;
          direct.orderIds.add(order.id);
          byCategoryId.set(item.categoryId, direct);

          const rootId = resolveRootCategoryId(item.categoryId);
          const top =
            byTopLevelId.get(rootId) ?? emptyBucket();
          top.salesAmount += item.lineTotalAmount;
          top.unitsSold += item.quantity;
          top.lineCount += 1;
          top.orderIds.add(order.id);
          byTopLevelId.set(rootId, top);

          totalSalesAmount += item.lineTotalAmount;
          totalUnitsSold += item.quantity;
          totalLineCount += 1;
          allOrderIds.add(order.id);
        }
      }
    }

    const currency =
      [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "USD";

    const toSharePercent = (amount: number) =>
      totalSalesAmount > 0
        ? Math.round((amount / totalSalesAmount) * 10000) / 100
        : 0;

    const categoriesReport = [...byCategoryId.entries()]
      .map(([categoryId, bucket]) => {
        const category = categoryById.get(categoryId);
        const parent = category?.parentId
          ? categoryById.get(category.parentId)
          : null;
        return {
          categoryId,
          name: category?.name ?? "Unknown category",
          slug: category?.slug ?? null,
          parentId: category?.parentId ?? null,
          parentName: parent?.name ?? null,
          salesAmount: bucket.salesAmount,
          unitsSold: bucket.unitsSold,
          lineCount: bucket.lineCount,
          orderCount: bucket.orderIds.size,
          sharePercent: toSharePercent(bucket.salesAmount),
        };
      })
      .sort((a, b) => b.salesAmount - a.salesAmount);

    const topLevelReport = [...byTopLevelId.entries()]
      .map(([categoryId, bucket]) => {
        const category = categoryById.get(categoryId);
        return {
          categoryId,
          name: category?.name ?? "Unknown category",
          slug: category?.slug ?? null,
          salesAmount: bucket.salesAmount,
          unitsSold: bucket.unitsSold,
          lineCount: bucket.lineCount,
          orderCount: bucket.orderIds.size,
          sharePercent: toSharePercent(bucket.salesAmount),
        };
      })
      .sort((a, b) => b.salesAmount - a.salesAmount);

    return {
      currency,
      mixedCurrencies: currencyCounts.size > 1,
      periodFrom: range.from?.toISOString() ?? null,
      periodTo: range.to?.toISOString() ?? null,
      totalSalesAmount,
      totalUnitsSold,
      totalLineCount,
      paidOrdersCount: allOrderIds.size,
      topLevelCategories: topLevelReport,
      categories: categoriesReport,
    };
  }

  async membership(range: ReportRange) {
    const invoices = (await this.membershipInvoiceRepository.listAll()).filter(
      (
        invoice: (Awaited<
          ReturnType<MembershipInvoiceRepository["listAll"]>
        >)[number]
      ) => this.isWithinRange(invoice.createdAt, range)
    );
    type MembershipInvoiceEntry = (typeof invoices)[number];

    return {
      membershipFeeAmount: env.MEMBERSHIP_FEE_AMOUNT,
      membershipTrialDays: env.MEMBERSHIP_TRIAL_DAYS,
      currency: env.MEMBERSHIP_INVOICE_CURRENCY,
      totalInvoices: invoices.length,
      pendingAmount: invoices
        .filter((invoice: MembershipInvoiceEntry) => invoice.status === "PENDING")
        .reduce(
          (sum: number, invoice: MembershipInvoiceEntry) => sum + invoice.amount,
          0
        ),
      paidAmount: invoices
        .filter((invoice: MembershipInvoiceEntry) => invoice.status === "PAID")
        .reduce(
          (sum: number, invoice: MembershipInvoiceEntry) => sum + invoice.amount,
          0
        ),
      waivedCount: invoices.filter(
        (invoice: MembershipInvoiceEntry) => invoice.status === "WAIVED"
      ).length,
      recentInvoices: invoices.slice(0, 50).map((invoice: MembershipInvoiceEntry) => ({
        id: invoice.id,
        vendorProfileId: invoice.vendorProfileId,
        vendorStoreName: invoice.vendorProfile.storeName,
        vendorStoreSlug: invoice.vendorProfile.storeSlug,
        vendorSubscriptionStatus: invoice.vendorProfile.subscriptionStatus,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        stripeInvoiceId: invoice.stripeInvoiceId,
        stripePaymentId: invoice.stripePaymentId,
        stripeCustomerId: invoice.stripeCustomerId,
        stripeSubscriptionId: invoice.stripeSubscriptionId,
        failureCode: invoice.failureCode,
        failureReason: invoice.failureReason,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        dueAt: invoice.dueAt.toISOString(),
        paidAt: invoice.paidAt?.toISOString() ?? null,
        attemptedAt: invoice.attemptedAt?.toISOString() ?? null,
        waivedReason: invoice.waivedReason,
      })),
    };
  }

  private resolveSignupRange(range: ReportRange) {
    if (range.from && range.to) {
      return { from: range.from, to: range.to };
    }

    if (range.from) {
      return { from: range.from, to: new Date() };
    }

    const to = range.to ?? new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);

    return { from, to };
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
}
