import { env } from "@/config/env";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
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

export class AdminReportService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly payoutRepository = new PayoutRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository(),
    private readonly refundCaseRepository = new RefundCaseRepository()
  ) {}

  async overview(range: ReportRange) {
    const customers = await this.userRepository.listByRole("CUSTOMER");
    const vendors = await this.vendorProfileRepository.listByStatus();
    const orders = (await this.orderRepository.listAll()).filter((order) =>
      this.isWithinRange(order.createdAt, range)
    );
    const settledOrders = orders.filter((order) =>
      this.isSettledPayment(order.paymentStatus)
    );
    const commissions = (await this.commissionLedgerRepository.listAll()).filter(
      (entry) => this.isWithinRange(entry.createdAt, range)
    );
    const payouts = (await this.payoutRepository.listAll()).filter((payout) =>
      this.isWithinRange(payout.createdAt, range)
    );
    const refundCases = (await this.refundCaseRepository.listAll()).filter((refundCase) =>
      this.isWithinRange(refundCase.createdAt, range)
    );

    return {
      customersCount: customers.length,
      vendorsCount: vendors.length,
      activeVendorsCount: vendors.filter((vendor) => vendor.status === "ACTIVE").length,
      pendingVendorsCount: vendors.filter((vendor) => vendor.status === "PENDING_APPROVAL").length,
      ordersCount: orders.length,
      paidOrdersCount: settledOrders.length,
      grossMerchandiseValue: settledOrders.reduce(
        (sum, order) => sum + order.grandTotalAmount,
        0
      ),
      totalCommissionAmount: commissions.reduce(
        (sum, entry) => sum + entry.commissionAmount,
        0
      ),
      payoutsOnHoldAmount: payouts
        .filter((payout) => payout.status === "ON_HOLD")
        .reduce((sum, payout) => sum + payout.amount, 0),
      payoutsSentAmount: payouts
        .filter((payout) => payout.status === "SENT")
        .reduce((sum, payout) => sum + payout.amount, 0),
      openRefundCasesCount: refundCases.filter(
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
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        dueAt: invoice.dueAt.toISOString(),
        paidAt: invoice.paidAt?.toISOString() ?? null,
        waivedReason: invoice.waivedReason,
      })),
    };
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
