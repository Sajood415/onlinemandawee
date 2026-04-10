import type { PaymentProvider } from "@/domain/payment/payment-types";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { durationFromNow } from "@/lib/utils/duration";
import { sha256 } from "@/lib/utils/crypto";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import { IdempotencyKeyRepository } from "@/repositories/idempotency-key.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PaymentTransactionRepository } from "@/repositories/payment-transaction.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";

type PaymentWebhookInput = {
  eventId: string;
  eventType: "payment.succeeded" | "payment.failed";
  orderId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  payload?: Record<string, unknown>;
};

export class PaymentWebhookService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly paymentTransactionRepository = new PaymentTransactionRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository(),
    private readonly payoutRepository = new PayoutRepository(),
    private readonly idempotencyKeyRepository = new IdempotencyKeyRepository()
  ) {}

  async process(provider: PaymentProvider, input: PaymentWebhookInput) {
    const idempotencyKey = `${provider}:${input.eventId}`;
    const requestHash = sha256(
      JSON.stringify({
        provider,
        ...input,
      })
    );

    const existingKey = await this.idempotencyKeyRepository.findByKey(idempotencyKey);

    if (existingKey?.status === "SUCCEEDED") {
      return existingKey.responseBody as Record<string, unknown>;
    }

    if (!existingKey) {
      await this.idempotencyKeyRepository.createInProgress({
        key: idempotencyKey,
        scope: `payment_webhook:${provider}`,
        requestHash,
        expiresAt: durationFromNow("7d"),
      });
    }

    try {
      const order = await this.orderRepository.findById(input.orderId);

      if (!order) {
        throw new AppError({
          code: ERROR_CODE.NOT_FOUND,
          message: "Order not found",
          statusCode: 404,
        });
      }

      if (
        input.amount !== order.grandTotalAmount ||
        input.currency !== order.currency
      ) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Webhook amount or currency does not match order",
          statusCode: 400,
        });
      }

      if (
        order.paymentStatus === "PAID" ||
        order.paymentStatus === "PARTIALLY_REFUNDED" ||
        order.paymentStatus === "REFUNDED"
      ) {
        const alreadyProcessedResponse = {
          provider,
          eventId: input.eventId,
          orderId: order.id,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          alreadyProcessed: true,
        };

        await this.idempotencyKeyRepository.markSucceeded({
          key: idempotencyKey,
          responseCode: 200,
          responseBody: alreadyProcessedResponse,
          resourceType: "Order",
          resourceId: order.id,
        });

        return alreadyProcessedResponse;
      }

      if (input.eventType === "payment.failed") {
        const failureTransaction =
          (await this.paymentTransactionRepository.findByProviderEventId(
            provider,
            input.eventId
          )) ??
          (await this.paymentTransactionRepository.create({
            orderId: order.id,
            provider,
            providerEventId: input.eventId,
            providerPaymentId: input.providerPaymentId,
            eventType: input.eventType,
            amount: input.amount,
            currency: input.currency,
            status: "FAILED",
            rawPayload: input.payload ?? {},
            processedAt: new Date(),
          }));

        const updatedOrder = await this.orderRepository.updateOrderStatus(
          order.id,
          order.status,
          "FAILED"
        );

        const failureResponse = {
          provider,
          eventId: input.eventId,
          orderId: order.id,
          orderStatus: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          transactionId: failureTransaction.id,
        };

        await this.idempotencyKeyRepository.markSucceeded({
          key: idempotencyKey,
          responseCode: 200,
          responseBody: failureResponse,
          resourceType: "PaymentTransaction",
          resourceId: failureTransaction.id,
        });

        return failureResponse;
      }

      const transaction =
        (await this.paymentTransactionRepository.findByProviderEventId(
          provider,
          input.eventId
        )) ??
        (await this.paymentTransactionRepository.create({
          orderId: order.id,
          provider,
          providerEventId: input.eventId,
          providerPaymentId: input.providerPaymentId,
          eventType: input.eventType,
          amount: input.amount,
          currency: input.currency,
          status: "SUCCEEDED",
          rawPayload: input.payload ?? {},
          processedAt: new Date(),
        }));

      for (const vendorOrder of order.vendorOrders) {
        const existingCommission =
          await this.commissionLedgerRepository.findByOrderVendorId(vendorOrder.id);

        if (existingCommission) {
          continue;
        }

        const commissionAmount = Math.round(
          (vendorOrder.subtotalAmount * env.COMMISSION_RATE_BPS) / 10000
        );
        const holdAmount = vendorOrder.grandTotalAmount - commissionAmount;

        await this.commissionLedgerRepository.create({
          orderId: order.id,
          orderVendorId: vendorOrder.id,
          vendorProfileId: vendorOrder.vendorProfileId,
          rateBps: env.COMMISSION_RATE_BPS,
          baseAmount: vendorOrder.subtotalAmount,
          commissionAmount,
          currency: vendorOrder.currency,
        });

        await this.vendorLedgerEntryRepository.create({
          vendorProfileId: vendorOrder.vendorProfileId,
          orderId: order.id,
          orderVendorId: vendorOrder.id,
          paymentTransactionId: transaction.id,
          bucket: "HOLD",
          entryType: "SALE_HOLD",
          amount: holdAmount,
          currency: vendorOrder.currency,
          description: `Held earnings for ${order.orderNumber}`,
        });

        const existingPayout = await this.payoutRepository.findByOrderVendorId(
          vendorOrder.id
        );

        if (!existingPayout) {
          await this.payoutRepository.create({
            vendorProfileId: vendorOrder.vendorProfileId,
            orderVendorId: vendorOrder.id,
            amount: holdAmount,
            currency: vendorOrder.currency,
            holdUntil: new Date(
              Date.now() + env.PAYOUT_HOLD_DAYS * 24 * 60 * 60 * 1000
            ),
          });
        }
      }

      const updatedOrder = await this.orderRepository.updateOrderStatus(
        order.id,
        "PAID",
        "PAID"
      );

      const response = {
        provider,
        eventId: input.eventId,
        orderId: order.id,
        orderStatus: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        transactionId: transaction.id,
        processedVendorSplits: updatedOrder.vendorOrders.length,
      };

      await this.idempotencyKeyRepository.markSucceeded({
        key: idempotencyKey,
        responseCode: 200,
        responseBody: response,
        resourceType: "PaymentTransaction",
        resourceId: transaction.id,
      });

      return response;
    } catch (error) {
      const statusCode =
        error instanceof AppError ? error.statusCode : 500;
      const body = {
        error:
          error instanceof AppError
            ? {
                code: error.code,
                message: error.message,
              }
            : {
                code: ERROR_CODE.INTERNAL_SERVER_ERROR,
                message: "Webhook processing failed",
              },
      };

      await this.idempotencyKeyRepository.markFailed({
        key: idempotencyKey,
        responseCode: statusCode,
        responseBody: body,
      });

      throw error;
    }
  }
}
