import { Prisma } from "@prisma/client";
import type {
  PaymentProvider,
  PaymentTransactionStatus,
} from "@/domain/payment/payment-types";
import { prisma } from "@/lib/db/prisma";

export class PaymentTransactionRepository {
  findByProviderEventId(provider: PaymentProvider, providerEventId: string) {
    return prisma.paymentTransaction.findUnique({
      where: {
        provider_providerEventId: {
          provider,
          providerEventId,
        },
      },
    });
  }

  create(input: {
    orderId: string;
    provider: PaymentProvider;
    providerEventId: string;
    providerPaymentId: string;
    eventType: string;
    amount: number;
    currency: string;
    status: PaymentTransactionStatus;
    rawPayload: Record<string, unknown>;
    processedAt?: Date;
  }) {
    return prisma.paymentTransaction.create({
      data: {
        orderId: input.orderId,
        provider: input.provider,
        providerEventId: input.providerEventId,
        providerPaymentId: input.providerPaymentId,
        eventType: input.eventType,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        rawPayload: input.rawPayload as Prisma.InputJsonValue,
        processedAt: input.processedAt ?? null,
      },
    });
  }

  listByOrderId(orderId: string) {
    return prisma.paymentTransaction.findMany({
      where: { orderId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
