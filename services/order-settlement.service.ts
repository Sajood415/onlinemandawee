import { vendorHasExternalPayoutAccount } from "@/lib/vendor/external-payout-account";
import { allocateFlatFeeToVendorSplit } from "@/lib/platform/transaction-fee";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { PlatformSettingsRepository } from "@/repositories/platform-settings.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { PayoutReleaseService } from "@/services/payout-release.service";

type VendorOrderForSettlement = {
  id: string;
  vendorProfileId: string;
  subtotalAmount: number;
  grandTotalAmount: number;
  currency: string;
  status: string;
};

const PAYOUT_HOLD_PENDING_DELIVERY = new Date("2099-12-31T00:00:00.000Z");

export class OrderSettlementService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository(),
    private readonly payoutRepository = new PayoutRepository(),
    private readonly platformSettingsRepository = new PlatformSettingsRepository(),
    private readonly payoutReleaseService = new PayoutReleaseService()
  ) {}

  /**
   * Records platform commission, vendor hold balance, and payout for one vendor split.
   * Safe to call multiple times (skips if commission already exists).
   */
  async settleVendorOrderSplit(input: {
    orderId: string;
    orderNumber: string;
    vendorOrder: VendorOrderForSettlement;
    paymentTransactionId?: string;
    orderPaymentStatus?: string;
  }) {
    const { vendorOrder } = input;
    const existingCommission =
      await this.commissionLedgerRepository.findByOrderVendorId(vendorOrder.id);

    if (existingCommission) {
      return { settled: false, reason: "already_settled" as const };
    }

    const order = await this.orderRepository.findById(input.orderId);
    const orderSubtotalAmount =
      order?.vendorOrders.reduce((sum, split) => sum + split.subtotalAmount, 0) ??
      vendorOrder.subtotalAmount;
    const platformSettings = await this.platformSettingsRepository.getOrCreate();
    const allocatedFee = allocateFlatFeeToVendorSplit({
      vendorSubtotalAmount: vendorOrder.subtotalAmount,
      orderSubtotalAmount,
      flatFeeAmountMinor: platformSettings.transactionFeeAmountMinor,
    });
    const commissionAmount = Math.min(allocatedFee, vendorOrder.grandTotalAmount);
    const netEarningsAmount = vendorOrder.grandTotalAmount - commissionAmount;

    await this.commissionLedgerRepository.create({
      orderId: input.orderId,
      orderVendorId: vendorOrder.id,
      vendorProfileId: vendorOrder.vendorProfileId,
      rateBps: 0,
      baseAmount: orderSubtotalAmount,
      commissionAmount,
      currency: vendorOrder.currency,
    });

    await this.vendorLedgerEntryRepository.create({
      vendorProfileId: vendorOrder.vendorProfileId,
      orderId: input.orderId,
      orderVendorId: vendorOrder.id,
      paymentTransactionId: input.paymentTransactionId,
      bucket: "HOLD",
      entryType: "SALE_HOLD",
      amount: netEarningsAmount,
      currency: vendorOrder.currency,
      description: `Held earnings for ${input.orderNumber}`,
    });

    const vendor = await this.vendorProfileRepository.findById(vendorOrder.vendorProfileId);
    const hasExternal = vendorHasExternalPayoutAccount(vendor?.payoutMethod ?? null);
    const isDelivered = vendorOrder.status === "DELIVERED";
    const isPaid =
      input.orderPaymentStatus === "PAID" ||
      input.orderPaymentStatus === "PARTIALLY_REFUNDED" ||
      input.orderPaymentStatus === "REFUNDED";

    const holdUntil =
      hasExternal || isDelivered
        ? new Date()
        : PAYOUT_HOLD_PENDING_DELIVERY;

    let payout = await this.payoutRepository.findByOrderVendorId(vendorOrder.id);

    if (!payout) {
      payout = await this.payoutRepository.create({
        vendorProfileId: vendorOrder.vendorProfileId,
        orderVendorId: vendorOrder.id,
        amount: netEarningsAmount,
        currency: vendorOrder.currency,
        holdUntil,
      });
    } else if (!hasExternal && isDelivered) {
      await this.payoutRepository.updateHoldUntil(payout.id, new Date());
    }

    await this.applyPayoutTransferPolicy({
      payoutId: payout.id,
      hasExternal,
      isPaid,
      isDelivered,
    });

    return {
      settled: true,
      commissionAmount,
      netEarningsAmount,
      hasExternalPayoutAccount: hasExternal,
    };
  }

  /** Settle vendor splits with external payout accounts when customer payment succeeds. */
  async settlePaidOrder(input: {
    orderId: string;
    orderNumber: string;
    vendorOrders: VendorOrderForSettlement[];
    paymentTransactionId?: string;
  }) {
    const results = [];

    for (const vendorOrder of input.vendorOrders) {
      const vendor = await this.vendorProfileRepository.findById(
        vendorOrder.vendorProfileId
      );
      const hasExternal = vendorHasExternalPayoutAccount(vendor?.payoutMethod ?? null);

      if (!hasExternal) {
        results.push({
          vendorOrderId: vendorOrder.id,
          settled: false,
          reason: "deferred_until_delivery" as const,
        });
        continue;
      }

      const result = await this.settleVendorOrderSplit({
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        vendorOrder,
        paymentTransactionId: input.paymentTransactionId,
        orderPaymentStatus: "PAID",
      });
      results.push({ vendorOrderId: vendorOrder.id, ...result });
    }

    await this.orderRepository.updateOrderStatus(input.orderId, "PAID", "PAID");

    return results;
  }

  /**
   * COD / no-external card: settle when delivered, then auto-transfer (external) or
   * leave on hold for manual admin release (no external).
   */
  async settleCodOnVendorDelivery(vendorOrderId: string) {
    const vendorOrder = await this.orderRepository.findVendorOrderById(vendorOrderId);

    if (!vendorOrder) {
      return { settled: false, reason: "not_found" as const };
    }

    if (vendorOrder.status !== "DELIVERED") {
      return { settled: false, reason: "not_delivered" as const };
    }

    const existingCommission =
      await this.commissionLedgerRepository.findByOrderVendorId(vendorOrder.id);

    if (existingCommission) {
      const vendor = await this.vendorProfileRepository.findById(
        vendorOrder.vendorProfileId
      );
      const hasExternal = vendorHasExternalPayoutAccount(vendor?.payoutMethod ?? null);
      const payout = await this.payoutRepository.findByOrderVendorId(vendorOrder.id);

      if (payout && !hasExternal) {
        await this.payoutRepository.updateHoldUntil(payout.id, new Date());
      }

      if (payout) {
        await this.applyPayoutTransferPolicy({
          payoutId: payout.id,
          hasExternal,
          isPaid: vendorOrder.order.paymentStatus === "PAID",
          isDelivered: true,
        });
      }

      return { settled: false, reason: "already_settled" as const };
    }

    if (
      vendorOrder.order.paymentStatus !== "UNPAID" &&
      vendorOrder.order.paymentStatus !== "PAID"
    ) {
      return { settled: false, reason: "invalid_payment_status" as const };
    }

    const result = await this.settleVendorOrderSplit({
      orderId: vendorOrder.orderId,
      orderNumber: vendorOrder.order.orderNumber,
      vendorOrder,
      orderPaymentStatus: vendorOrder.order.paymentStatus,
    });

    await this.syncParentOrderPaymentStatus(vendorOrder.orderId);

    return { settled: result.settled, reason: "delivered" as const };
  }

  /** Backfill settlements for delivered orders that were never settled. */
  async reconcileUnsettledDeliveredOrders(vendorProfileId: string) {
    const vendorOrders = await this.orderRepository.listByVendorProfileId(vendorProfileId);
    let settledCount = 0;

    for (const vendorOrder of vendorOrders) {
      if (vendorOrder.status !== "DELIVERED") continue;

      const existing =
        await this.commissionLedgerRepository.findByOrderVendorId(vendorOrder.id);
      if (existing) continue;

      if (
        vendorOrder.order.paymentStatus !== "UNPAID" &&
        vendorOrder.order.paymentStatus !== "PAID"
      ) {
        continue;
      }

      await this.settleVendorOrderSplit({
        orderId: vendorOrder.orderId,
        orderNumber: vendorOrder.order.orderNumber,
        vendorOrder,
        orderPaymentStatus: vendorOrder.order.paymentStatus,
      });
      settledCount += 1;
      await this.syncParentOrderPaymentStatus(vendorOrder.orderId);
    }

    return { settledCount };
  }

  private async applyPayoutTransferPolicy(input: {
    payoutId: string;
    hasExternal: boolean;
    isPaid: boolean;
    isDelivered: boolean;
  }) {
    if (!input.hasExternal) {
      return;
    }

    // External account: auto-transfer once order is confirmed (paid) or COD is delivered.
    if (input.isPaid || input.isDelivered) {
      await this.payoutReleaseService.autoTransfer(input.payoutId);
    }
  }

  private async syncParentOrderPaymentStatus(orderId: string) {
    const order = await this.orderRepository.findById(orderId);
    if (!order || order.paymentStatus === "PAID") return;

    const commissions = await Promise.all(
      order.vendorOrders.map((vo) =>
        this.commissionLedgerRepository.findByOrderVendorId(vo.id)
      )
    );

    const allSettled = commissions.every((entry) => entry != null);
    if (!allSettled) return;

    const allDelivered = order.vendorOrders.every((vo) => vo.status === "DELIVERED");
    if (!allDelivered) return;

    await this.orderRepository.updateOrderStatus(orderId, "FULFILLED", "PAID");
  }
}
