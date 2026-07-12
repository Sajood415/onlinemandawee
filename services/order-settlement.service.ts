import { Prisma } from "@prisma/client";

import { computeInitialPayoutHoldUntil } from "@/lib/payout/payout-hold";
import {
  DELIVERY_RULE_CURRENCY,
} from "@/lib/delivery/delivery-rule-currency";
import {
  resolveOrderTransactionFeeTarget,
  resolveTransactionFeeAmountMinor,
} from "@/lib/delivery/resolve-delivery-rule";
import { normalizeDeliveryCountryCode } from "@/lib/geo/shipping-locations";
import { convertMinorUnits } from "@/lib/currency/convert";
import {
  allocateFlatFeeToVendorSplit,
  FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR,
  usesFixedTransactionFeeDeliveryMethod,
} from "@/lib/platform/transaction-fee";
import { prisma } from "@/lib/db/prisma";
import { DeliveryRuleRepository } from "@/repositories/delivery-rule.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PlatformSettingsRepository } from "@/repositories/platform-settings.repository";

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
};

export class OrderSettlementService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly deliveryRuleRepository = new DeliveryRuleRepository(),
    private readonly platformSettingsRepository = new PlatformSettingsRepository()
  ) {}

  /**
   * Records platform transaction fee, vendor hold balance, and payout for one vendor split.
   * Safe to call multiple times (skips if commission already exists).
   */
  async settleVendorOrderSplit(input: {
    orderId: string;
    orderNumber: string;
    vendorOrder: VendorOrderForSettlement;
    paymentTransactionId?: string;
    deliveryMethod?: DeliveryMethodForSettlement;
    shippingCountry?: string | null;
    billableOrderSubtotalAmount: number;
    flatFeeAmountMinor: number;
  }) {
    const { vendorOrder } = input;

    const effectiveDeliveryMethod =
      vendorOrder.deliveryMethod ?? input.deliveryMethod ?? null;

    const isPlatformVendor = vendorOrder.sellerType === "PLATFORM";
    const commissionAmount = isPlatformVendor
      ? 0
      : Math.min(
          allocateFlatFeeToVendorSplit({
            vendorSubtotalAmount: Math.max(0, vendorOrder.subtotalAmount),
            orderSubtotalAmount: input.billableOrderSubtotalAmount,
            flatFeeAmountMinor: input.flatFeeAmountMinor,
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
            rateBps: 0,
            baseAmount: Math.max(0, vendorOrder.subtotalAmount),
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
    const shippingCountry = order?.shippingCountry ?? null;

    const billableVendorOrders = input.vendorOrders.filter(
      (vendorOrder) => vendorOrder.sellerType !== "PLATFORM"
    );
    const billableOrderSubtotalAmount = billableVendorOrders.reduce(
      (sum, vendorOrder) => sum + Math.max(0, vendorOrder.subtotalAmount),
      0
    );

    const flatFeeAmountMinor =
      billableVendorOrders.length === 0
        ? 0
        : await this.resolveOrderTransactionFeeAmountMinor({
            deliveryMethod,
            shippingCountry,
            vendorProfileIds: billableVendorOrders.map(
              (vendorOrder) => vendorOrder.vendorProfileId
            ),
            orderCurrency: input.vendorOrders[0]?.currency ?? "USD",
          });

    for (const vendorOrder of input.vendorOrders) {
      const result = await this.settleVendorOrderSplit({
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        vendorOrder,
        paymentTransactionId: input.paymentTransactionId,
        deliveryMethod,
        shippingCountry,
        billableOrderSubtotalAmount,
        flatFeeAmountMinor,
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

  private async resolveOrderTransactionFeeAmountMinor(input: {
    deliveryMethod: DeliveryMethodForSettlement;
    shippingCountry?: string | null;
    vendorProfileIds: string[];
    orderCurrency: string;
  }) {
    if (usesFixedTransactionFeeDeliveryMethod(input.deliveryMethod)) {
      return convertMinorUnits(
        FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR,
        DELIVERY_RULE_CURRENCY,
        input.orderCurrency
      );
    }

    const platformSettings = await this.platformSettingsRepository.getOrCreate();
    const fallbackAmountMinor = convertMinorUnits(
      platformSettings.transactionFeeAmountMinor,
      DELIVERY_RULE_CURRENCY,
      input.orderCurrency
    );

    if (!input.deliveryMethod) {
      return fallbackAmountMinor;
    }

    const rule = await this.deliveryRuleRepository.findBestActiveRule({
      method: input.deliveryMethod,
      vendorProfileId: resolveOrderTransactionFeeTarget({
        vendorProfileIds: input.vendorProfileIds,
      }),
      countryCode:
        normalizeDeliveryCountryCode(input.shippingCountry ?? undefined) ??
        input.shippingCountry ??
        undefined,
    });

    const feeUsdMinor = resolveTransactionFeeAmountMinor({
      deliveryMethod: input.deliveryMethod,
      ruleTransactionFeeAmountMinor: rule?.transactionFeeAmountMinor,
      fallbackAmountMinor: platformSettings.transactionFeeAmountMinor,
    });

    return convertMinorUnits(feeUsdMinor, DELIVERY_RULE_CURRENCY, input.orderCurrency);
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
