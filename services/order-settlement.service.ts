import { Prisma } from "@prisma/client";

import { env } from "@/config/env.shared";
import { computeInitialPayoutHoldUntil } from "@/lib/payout/payout-hold";
import {
  calculateCommissionAmountMinor,
  resolveCommissionBaseAmountMinor,
} from "@/lib/platform/transaction-fee";
import { prisma } from "@/lib/db/prisma";
import { OrderRepository } from "@/repositories/order.repository";

type DeliveryMethodForSettlement = "PICKUP" | "EXPRESS" | "STANDARD" | null;

type VendorOrderForSettlement = {
  id: string;
  vendorProfileId: string;
  sellerType?: "PLATFORM" | "THIRD_PARTY";
  deliveryMethod?: DeliveryMethodForSettlement;
  subtotalAmount: number;
  deliveryAmount: number;
  grandTotalAmount: number;
  currency: string;
  vendorProfile?: {
    sellerType?: "PLATFORM" | "THIRD_PARTY";
  };
};

export class OrderSettlementService {
  constructor(private readonly orderRepository = new OrderRepository()) {}

  /**
   * Records platform commission (3.99% of products + Express delivery when applicable),
   * vendor hold balance, and payout for one vendor split.
   * Safe to call multiple times (skips if commission already exists).
   */
  async settleVendorOrderSplit(input: {
    orderId: string;
    orderNumber: string;
    vendorOrder: VendorOrderForSettlement;
    paymentTransactionId?: string;
    deliveryMethod?: DeliveryMethodForSettlement;
  }) {
    const { vendorOrder } = input;

    const effectiveDeliveryMethod =
      vendorOrder.deliveryMethod ?? input.deliveryMethod ?? null;

    const sellerType =
      vendorOrder.sellerType ??
      vendorOrder.vendorProfile?.sellerType ??
      "THIRD_PARTY";
    const isPlatformVendor = sellerType === "PLATFORM";
    const rateBps = isPlatformVendor ? 0 : env.COMMISSION_RATE_BPS;
    const baseAmount = resolveCommissionBaseAmountMinor({
      subtotalAmount: vendorOrder.subtotalAmount,
      deliveryAmount: vendorOrder.deliveryAmount,
      deliveryMethod: effectiveDeliveryMethod,
    });
    const commissionAmount = isPlatformVendor
      ? 0
      : Math.min(
          calculateCommissionAmountMinor({
            baseAmountMinor: baseAmount,
            rateBps,
          }),
          vendorOrder.grandTotalAmount
        );
    const netEarningsAmount = vendorOrder.grandTotalAmount - commissionAmount;

    const holdUntil = computeInitialPayoutHoldUntil(effectiveDeliveryMethod);

    try {
      await prisma.$transaction(async (tx) => {
        const existingCommission = await tx.commissionLedger.findUnique({
          where: { orderVendorId: vendorOrder.id },
        });
        if (existingCommission) return;

        await tx.commissionLedger.create({
          data: {
            orderId: input.orderId,
            orderVendorId: vendorOrder.id,
            vendorProfileId: vendorOrder.vendorProfileId,
            rateBps,
            baseAmount,
            commissionAmount,
            currency: vendorOrder.currency,
          },
        });

        await tx.vendorLedgerEntry.create({
          data: {
            vendorProfileId: vendorOrder.vendorProfileId,
            orderId: input.orderId,
            orderVendorId: vendorOrder.id,
            paymentTransactionId: input.paymentTransactionId ?? null,
            bucket: "HOLD",
            entryType: "SALE_HOLD",
            amount: netEarningsAmount,
            currency: vendorOrder.currency,
            description: `Held earnings for ${input.orderNumber}`,
          },
        });

        const existingPayout = await tx.payout.findUnique({
          where: { orderVendorId: vendorOrder.id },
        });

        if (!existingPayout) {
          await tx.payout.create({
            data: {
              vendorProfileId: vendorOrder.vendorProfileId,
              orderVendorId: vendorOrder.id,
              amount: netEarningsAmount,
              currency: vendorOrder.currency,
              holdUntil,
            },
          });
          return;
        }

        await tx.payout.update({
          where: { id: existingPayout.id },
          data: { holdUntil },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { settled: false, reason: "already_settled" as const };
      }
      throw error;
    }

    return {
      settled: true,
      commissionAmount,
      netEarningsAmount,
    };
  }

  /** Settle all vendor splits when customer payment succeeds. */
  async settlePaidOrder(input: {
    orderId: string;
    orderNumber: string;
    vendorOrders: VendorOrderForSettlement[];
    paymentTransactionId?: string;
  }) {
    const results = [];
    const order = await this.orderRepository.findById(input.orderId);
    const deliveryMethod: DeliveryMethodForSettlement = order?.deliveryMethod ?? null;

    for (const vendorOrder of input.vendorOrders) {
      const result = await this.settleVendorOrderSplit({
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        vendorOrder,
        paymentTransactionId: input.paymentTransactionId,
        deliveryMethod,
      });
      results.push({ vendorOrderId: vendorOrder.id, ...result });
    }

    await this.orderRepository.updateOrderStatus(input.orderId, "PAID", "PAID");

    return results;
  }

  async settleOrderById(input: { orderId: string; paymentTransactionId?: string }) {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      return {
        settled: false,
        reason: "order_not_found" as const,
        results: [] as unknown[],
      };
    }

    const results = await this.settlePaidOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      vendorOrders: order.vendorOrders,
      paymentTransactionId: input.paymentTransactionId,
    });

    return { settled: true, results };
  }

  /**
   * Legacy reconciliation hook kept for dashboard/report callers.
   * Card-only checkout settles at payment time, so no delivered-order backfill is needed.
   */
  async reconcileUnsettledDeliveredOrders(_vendorProfileId: string) {
    void _vendorProfileId;
    return { settledCount: 0 };
  }
}
