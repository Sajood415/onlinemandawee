import type {
  SupplyRequestDeliveryMode,
  SupplyRequestPaymentMethod,
  SupplyRequestStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const supplyRequestSelect = {
  id: true,
  requestNumber: true,
  userId: true,
  guestTrackingToken: true,
  productName: true,
  brand: true,
  modelSku: true,
  quantity: true,
  description: true,
  referenceUrls: true,
  imageUrls: true,
  categoryHint: true,
  budgetMinMinor: true,
  budgetMaxMinor: true,
  budgetCurrency: true,
  neededByDate: true,
  urgencyNote: true,
  allowAlternatives: true,
  deliveryMode: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  whatsapp: true,
  preferredContact: true,
  city: true,
  province: true,
  address: true,
  adminNote: true,
  rejectReason: true,
  quoteAmountMinor: true,
  quoteCurrency: true,
  quoteNote: true,
  quoteImageUrl: true,
  quoteSentAt: true,
  quoteExpiresAt: true,
  paidAt: true,
  paidAmountMinor: true,
  paymentMethod: true,
  offlinePaymentNote: true,
  stripePaymentIntentId: true,
  refundedAt: true,
  refundAmountMinor: true,
  refundNote: true,
  stripeRefundId: true,
  trackingRef: true,
  carrierNote: true,
  shippedAt: true,
  completedAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class SupplyRequestRepository {
  findByRequestNumber(requestNumber: string) {
    return prisma.supplyRequest.findUnique({
      where: { requestNumber },
    });
  }

  findById(id: string) {
    return prisma.supplyRequest.findUnique({
      where: { id },
      select: supplyRequestSelect,
    });
  }

  findByGuestTrackingToken(token: string) {
    return prisma.supplyRequest.findUnique({
      where: { guestTrackingToken: token },
      select: supplyRequestSelect,
    });
  }

  list(filters?: { status?: SupplyRequestStatus; search?: string }) {
    const search = filters?.search?.trim();

    return prisma.supplyRequest.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(search
          ? {
              OR: [
                { requestNumber: { contains: search, mode: "insensitive" } },
                { customerName: { contains: search, mode: "insensitive" } },
                { customerEmail: { contains: search, mode: "insensitive" } },
                { customerPhone: { contains: search, mode: "insensitive" } },
                { productName: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: supplyRequestSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  listForCustomer(input: { userId: string; customerEmail: string }) {
    return prisma.supplyRequest.findMany({
      where: {
        OR: [{ userId: input.userId }, { customerEmail: input.customerEmail }],
      },
      select: supplyRequestSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  findByIdForCustomer(
    id: string,
    input: { userId: string; customerEmail: string }
  ) {
    return prisma.supplyRequest.findFirst({
      where: {
        id,
        OR: [{ userId: input.userId }, { customerEmail: input.customerEmail }],
      },
      select: supplyRequestSelect,
    });
  }

  linkGuestRequestsToUser(userId: string, customerEmail: string) {
    return prisma.supplyRequest.updateMany({
      where: {
        userId: null,
        customerEmail,
      },
      data: { userId },
    });
  }

  create(input: {
    requestNumber: string;
    guestTrackingToken: string;
    userId?: string | null;
    productName: string;
    brand?: string | null;
    modelSku?: string | null;
    quantity: number;
    description: string;
    referenceUrls?: string[];
    imageUrls?: string[];
    categoryHint?: string | null;
    budgetMinMinor?: number | null;
    budgetMaxMinor?: number | null;
    budgetCurrency?: string | null;
    neededByDate?: string | null;
    urgencyNote?: string | null;
    allowAlternatives: boolean;
    deliveryMode: SupplyRequestDeliveryMode;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    whatsapp?: string | null;
    preferredContact?: string | null;
    city: string;
    province?: string | null;
    address: string;
  }) {
    return prisma.supplyRequest.create({
      data: {
        requestNumber: input.requestNumber,
        guestTrackingToken: input.guestTrackingToken,
        userId: input.userId ?? null,
        productName: input.productName,
        brand: input.brand ?? null,
        modelSku: input.modelSku ?? null,
        quantity: input.quantity,
        description: input.description,
        referenceUrls: input.referenceUrls ?? [],
        imageUrls: input.imageUrls ?? [],
        categoryHint: input.categoryHint ?? null,
        budgetMinMinor: input.budgetMinMinor ?? null,
        budgetMaxMinor: input.budgetMaxMinor ?? null,
        budgetCurrency: input.budgetCurrency ?? null,
        neededByDate: input.neededByDate ?? null,
        urgencyNote: input.urgencyNote ?? null,
        allowAlternatives: input.allowAlternatives,
        deliveryMode: input.deliveryMode,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        whatsapp: input.whatsapp ?? null,
        preferredContact: input.preferredContact ?? null,
        city: input.city,
        province: input.province ?? null,
        address: input.address,
        status: "SUBMITTED",
      },
      select: supplyRequestSelect,
    });
  }

  update(id: string, data: Record<string, unknown>) {
    return prisma.supplyRequest.update({
      where: { id },
      data,
      select: supplyRequestSelect,
    });
  }

  updateStatus(id: string, status: SupplyRequestStatus) {
    return prisma.supplyRequest.update({
      where: { id },
      data: { status },
      select: supplyRequestSelect,
    });
  }

  updateQuote(
    id: string,
    input: {
      quoteAmountMinor: number;
      quoteCurrency: string;
      quoteNote?: string | null;
      quoteImageUrl?: string | null;
      quoteSentAt: Date;
      quoteExpiresAt: Date;
      stripePaymentIntentId?: string | null;
      status: SupplyRequestStatus;
    }
  ) {
    return prisma.supplyRequest.update({
      where: { id },
      data: {
        quoteAmountMinor: input.quoteAmountMinor,
        quoteCurrency: input.quoteCurrency,
        quoteNote: input.quoteNote ?? null,
        quoteImageUrl: input.quoteImageUrl ?? null,
        quoteSentAt: input.quoteSentAt,
        quoteExpiresAt: input.quoteExpiresAt,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        status: input.status,
      },
      select: supplyRequestSelect,
    });
  }

  markPaid(
    id: string,
    input: {
      paidAt: Date;
      paidAmountMinor: number;
      paymentMethod: SupplyRequestPaymentMethod;
      offlinePaymentNote?: string | null;
      stripePaymentIntentId?: string | null;
      status: SupplyRequestStatus;
    }
  ) {
    return prisma.supplyRequest.update({
      where: { id },
      data: {
        paidAt: input.paidAt,
        paidAmountMinor: input.paidAmountMinor,
        paymentMethod: input.paymentMethod,
        offlinePaymentNote: input.offlinePaymentNote ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        status: input.status,
      },
      select: supplyRequestSelect,
    });
  }

  findByStripePaymentIntentId(stripePaymentIntentId: string) {
    return prisma.supplyRequest.findFirst({
      where: { stripePaymentIntentId },
      select: supplyRequestSelect,
    });
  }

  listPaidForReporting() {
    return prisma.supplyRequest.findMany({
      where: {
        paidAt: { not: null },
        paidAmountMinor: { not: null },
      },
      select: {
        paidAt: true,
        paidAmountMinor: true,
        quoteCurrency: true,
        refundAmountMinor: true,
      },
      orderBy: { paidAt: "desc" },
    });
  }

  countRecentByEmail(customerEmail: string, since: Date) {
    return prisma.supplyRequest.count({
      where: {
        customerEmail,
        createdAt: { gte: since },
      },
    });
  }
}

export type SupplyRequestRecord = NonNullable<
  Awaited<ReturnType<SupplyRequestRepository["findById"]>>
>;
