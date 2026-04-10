import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

type ReportRange = {
  from?: Date;
  to?: Date;
};

export class VendorReportService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly payoutRepository = new PayoutRepository()
  ) {}

  async sales(auth: AuthenticatedUser, range: ReportRange) {
    const vendor = await this.requireActiveVendor(auth.id);
    const vendorOrders = (await this.orderRepository.listByVendorProfileId(vendor.id)).filter(
      (vendorOrder) => this.isWithinRange(vendorOrder.createdAt, range)
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
    const payouts = (await this.payoutRepository.listByVendorProfileId(vendor.id)).filter(
      (payout) => this.isWithinRange(payout.createdAt, range)
    );

    return {
      vendorProfileId: vendor.id,
      totalPayouts: payouts.length,
      totalAmount: payouts.reduce((sum, payout) => sum + payout.amount, 0),
      byStatus: {
        ON_HOLD: payouts.filter((item) => item.status === "ON_HOLD").length,
        READY: payouts.filter((item) => item.status === "READY").length,
        SENT: payouts.filter((item) => item.status === "SENT").length,
        FAILED: payouts.filter((item) => item.status === "FAILED").length,
      },
      payouts: payouts.slice(0, 50).map((payout) => ({
        id: payout.id,
        orderVendorId: payout.orderVendorId,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        holdUntil: payout.holdUntil.toISOString(),
        releasedAt: payout.releasedAt?.toISOString() ?? null,
        sentAt: payout.sentAt?.toISOString() ?? null,
        failureReason: payout.failureReason,
        createdAt: payout.createdAt.toISOString(),
      })),
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

    return vendor;
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
}
