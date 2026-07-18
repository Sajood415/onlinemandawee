import "server-only";

import { Prisma } from "@prisma/client";

import type { PaymentStatus } from "@/domain/order/order-status";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { prisma } from "@/lib/db/prisma";
import { getStripeRefundableBalance } from "@/lib/orders/stripe-refundable-amount";
import { resolvePaymentStatusFromStripe } from "@/lib/orders/sync-payment-status-from-stripe";
import { getStripeServerClient } from "@/lib/stripe/server";
import { durationFromNow } from "@/lib/utils/duration";
import { sha256 } from "@/lib/utils/crypto";
import { IdempotencyKeyRepository } from "@/repositories/idempotency-key.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";

type CancelRefundResult = {
  refundedAmount: number;
  paymentStatus: PaymentStatus;
  stripeRefundId: string | null;
  skipped: boolean;
  skipReason?: string;
};

export class OrderCancelRefundService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly payoutRepository = new PayoutRepository(),
    private readonly idempotencyKeyRepository = new IdempotencyKeyRepository()
  ) {}

  /**
   * Refunds via Stripe before order cancellation is applied.
   * - full: refund remaining charge on the payment
   * - vendor: refund that vendor split (capped by remaining charge)
   */
  async refundBeforeCancel(input: {
    orderId: string;
    mode: "full" | "vendor";
    vendorOrderId?: string;
    actor: "CUSTOMER" | "VENDOR" | "ADMIN" | "SYSTEM";
  }): Promise<CancelRefundResult> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    if (
      order.paymentStatus === "UNPAID" ||
      order.paymentStatus === "PENDING" ||
      order.paymentStatus === "REFUNDED"
    ) {
      return {
        refundedAmount: 0,
        paymentStatus: order.paymentStatus,
        stripeRefundId: null,
        skipped: true,
        skipReason: `payment_${order.paymentStatus.toLowerCase()}`,
      };
    }

    if (!order.stripePaymentIntentId) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message:
          "This paid order has no Stripe payment to refund. Contact support before cancelling.",
        statusCode: 409,
      });
    }

    const stripe = getStripeServerClient();
    const { remaining } = await getStripeRefundableBalance(
      order.stripePaymentIntentId
    );

    if (remaining <= 0) {
      const paymentStatus = await resolvePaymentStatusFromStripe({
        stripePaymentIntentId: order.stripePaymentIntentId,
        fallbackStatus: "REFUNDED",
      });
      await this.orderRepository.updateOrderPaymentStatus(order.id, paymentStatus);
      return {
        refundedAmount: 0,
        paymentStatus,
        stripeRefundId: null,
        skipped: true,
        skipReason: "already_fully_refunded",
      };
    }

    let requestedAmount = remaining;
    const vendorOrdersToDebit: Array<{
      id: string;
      vendorProfileId: string;
      grandTotalAmount: number;
      currency: string;
    }> = [];

    if (input.mode === "vendor") {
      if (!input.vendorOrderId) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Vendor order is required for partial cancel refund",
          statusCode: 400,
        });
      }
      const vendorOrder = order.vendorOrders.find(
        (row) => row.id === input.vendorOrderId
      );
      if (!vendorOrder) {
        throw new AppError({
          code: ERROR_CODE.NOT_FOUND,
          message: "Vendor order not found",
          statusCode: 404,
        });
      }
      requestedAmount = Math.min(vendorOrder.grandTotalAmount, remaining);
      vendorOrdersToDebit.push({
        id: vendorOrder.id,
        vendorProfileId: vendorOrder.vendorProfileId,
        grandTotalAmount: vendorOrder.grandTotalAmount,
        currency: vendorOrder.currency,
      });
    } else {
      for (const vendorOrder of order.vendorOrders) {
        if (vendorOrder.status === "CANCELLED" || vendorOrder.status === "DELIVERED") {
          continue;
        }
        vendorOrdersToDebit.push({
          id: vendorOrder.id,
          vendorProfileId: vendorOrder.vendorProfileId,
          grandTotalAmount: vendorOrder.grandTotalAmount,
          currency: vendorOrder.currency,
        });
      }
    }

    if (requestedAmount <= 0) {
      return {
        refundedAmount: 0,
        paymentStatus: order.paymentStatus,
        stripeRefundId: null,
        skipped: true,
        skipReason: "zero_refund_amount",
      };
    }

    const idempotencyKey =
      input.mode === "vendor"
        ? `order-cancel-refund:vendor:${input.vendorOrderId}`
        : `order-cancel-refund:full:${order.id}`;
    const requestHash = sha256(
      JSON.stringify({
        orderId: order.id,
        mode: input.mode,
        vendorOrderId: input.vendorOrderId ?? null,
        requestedAmount,
        actor: input.actor,
      })
    );

    const existingKey =
      await this.idempotencyKeyRepository.findByKey(idempotencyKey);
    if (existingKey?.status === "SUCCEEDED") {
      const body = existingKey.responseBody as Record<string, unknown>;
      const paymentStatus = await resolvePaymentStatusFromStripe({
        stripePaymentIntentId: order.stripePaymentIntentId,
        fallbackStatus: (body.paymentStatus as PaymentStatus) ?? "REFUNDED",
      });
      await this.orderRepository.updateOrderPaymentStatus(order.id, paymentStatus);
      return {
        refundedAmount: Number(body.refundedAmount ?? requestedAmount),
        paymentStatus,
        stripeRefundId: body.stripeRefundId
          ? String(body.stripeRefundId)
          : null,
        skipped: false,
      };
    }

    if (!existingKey) {
      await this.idempotencyKeyRepository.createInProgress({
        key: idempotencyKey,
        scope: "order_cancel_refund",
        requestHash,
        expiresAt: durationFromNow("7d"),
      });
    }

    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: requestedAmount,
          reason: "requested_by_customer",
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            source: "order_cancel",
            mode: input.mode,
            actor: input.actor,
            vendorOrderId: input.vendorOrderId ?? "",
          },
        },
        { idempotencyKey }
      );

      if (refund.status && refund.status !== "succeeded" && refund.status !== "pending") {
        await this.idempotencyKeyRepository.markFailed({
          key: idempotencyKey,
          responseCode: 502,
          responseBody: {
            error: "stripe_refund_failed",
            status: refund.status,
            refundId: refund.id,
          },
        });
        throw new AppError({
          code: ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: "Could not refund the payment. Order was not cancelled.",
          statusCode: 502,
        });
      }

      for (const vendorOrder of vendorOrdersToDebit) {
        await this.applyVendorCancelDebit({
          orderId: order.id,
          orderVendorId: vendorOrder.id,
          vendorProfileId: vendorOrder.vendorProfileId,
          approvedAmount:
            input.mode === "full"
              ? vendorOrder.grandTotalAmount
              : requestedAmount,
          currency: vendorOrder.currency,
        });
      }

      const paymentStatus = await resolvePaymentStatusFromStripe({
        stripePaymentIntentId: order.stripePaymentIntentId,
        fallbackStatus:
          requestedAmount >= remaining ? "REFUNDED" : "PARTIALLY_REFUNDED",
      });
      await this.orderRepository.updateOrderPaymentStatus(order.id, paymentStatus);

      await this.idempotencyKeyRepository.markSucceeded({
        key: idempotencyKey,
        responseCode: 200,
        responseBody: {
          refundedAmount: requestedAmount,
          paymentStatus,
          stripeRefundId: refund.id,
        },
        resourceType: "Order",
        resourceId: order.id,
      });

      return {
        refundedAmount: requestedAmount,
        paymentStatus,
        stripeRefundId: refund.id,
        skipped: false,
      };
    } catch (error) {
      if (!(error instanceof AppError)) {
        await this.idempotencyKeyRepository.markFailed({
          key: idempotencyKey,
          responseCode: 502,
          responseBody: {
            error: "stripe_refund_failed",
            message: "Stripe refund request failed",
          },
        });
        throw new AppError({
          code: ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: "Could not refund the payment. Order was not cancelled.",
          statusCode: 502,
        });
      }
      throw error;
    }
  }

  private async applyVendorCancelDebit(input: {
    orderId: string;
    orderVendorId: string;
    vendorProfileId: string;
    approvedAmount: number;
    currency: string;
  }) {
    const existing = await prisma.vendorLedgerEntry.findFirst({
      where: {
        orderVendorId: input.orderVendorId,
        entryType: { in: ["REFUND_DEBIT_HOLD", "REFUND_DEBIT_AVAILABLE"] },
        description: { contains: "Order cancelled refund" },
      },
    });
    if (existing) return;

    const payout = await this.payoutRepository.findByOrderVendorId(
      input.orderVendorId
    );
    const bucket = payout && payout.status === "ON_HOLD" ? "HOLD" : "AVAILABLE";
    const entryType =
      bucket === "HOLD" ? "REFUND_DEBIT_HOLD" : "REFUND_DEBIT_AVAILABLE";

    try {
      await prisma.$transaction(async (tx) => {
        const already = await tx.vendorLedgerEntry.findFirst({
          where: {
            orderVendorId: input.orderVendorId,
            entryType: { in: ["REFUND_DEBIT_HOLD", "REFUND_DEBIT_AVAILABLE"] },
            description: { contains: "Order cancelled refund" },
          },
        });
        if (already) return;

        const orderVendor = await tx.orderVendor.findUnique({
          where: { id: input.orderVendorId },
          select: { grandTotalAmount: true },
        });
        const commission = await tx.commissionLedger.findUnique({
          where: { orderVendorId: input.orderVendorId },
          select: { commissionAmount: true },
        });

        const refundableGrossAmount = orderVendor?.grandTotalAmount ?? 0;
        const commissionAmount = commission?.commissionAmount ?? 0;
        const commissionRefundAmount =
          refundableGrossAmount > 0
            ? Math.min(
                input.approvedAmount,
                Math.max(
                  0,
                  Math.round(
                    (input.approvedAmount * commissionAmount) /
                      refundableGrossAmount
                  )
                )
              )
            : 0;
        const vendorDebitAmount = Math.max(
          0,
          Math.min(
            input.approvedAmount,
            input.approvedAmount - commissionRefundAmount
          )
        );

        await tx.vendorLedgerEntry.create({
          data: {
            vendorProfileId: input.vendorProfileId,
            orderId: input.orderId,
            orderVendorId: input.orderVendorId,
            payoutId: payout?.id ?? null,
            bucket,
            entryType,
            amount: -vendorDebitAmount,
            currency: input.currency,
            description: `Order cancelled refund for order vendor ${input.orderVendorId}.`,
          },
        });

        if (
          payout &&
          (payout.status === "ON_HOLD" || payout.status === "READY")
        ) {
          await tx.payout.update({
            where: { id: payout.id },
            data: {
              amount: Math.max(0, payout.amount - vendorDebitAmount),
            },
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return;
      }
      throw error;
    }
  }
}
