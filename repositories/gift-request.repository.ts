import type { GiftRequestPaymentMethod, GiftRequestStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const giftRequestSelect = {
  id: true,
  requestNumber: true,
  userId: true,
  senderName: true,
  senderEmail: true,
  senderPhone: true,
  recipientName: true,
  recipientPhone: true,
  recipientCity: true,
  recipientProvince: true,
  recipientAddress: true,
  occasion: true,
  preferredDeliveryDate: true,
  itemType: true,
  dressColor: true,
  dressSize: true,
  dressSleeveType: true,
  dressLength: true,
  dressFitting: true,
  dressTexture: true,
  dressForMale: true,
  dressForFemale: true,
  preparationNotes: true,
  deliveryInstructions: true,
  budgetNote: true,
  imageUrls: true,
  videoUrls: true,
  quoteAmountMinor: true,
  quoteCurrency: true,
  quoteNote: true,
  quoteImageUrl: true,
  quoteSentAt: true,
  paidAt: true,
  paidAmountMinor: true,
  paymentMethod: true,
  offlinePaymentNote: true,
  stripePaymentIntentId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class GiftRequestRepository {
  findByRequestNumber(requestNumber: string) {
    return prisma.giftRequest.findUnique({
      where: { requestNumber },
    });
  }

  findById(id: string) {
    return prisma.giftRequest.findUnique({
      where: { id },
      select: giftRequestSelect,
    });
  }

  list(filters?: { status?: GiftRequestStatus; search?: string }) {
    const search = filters?.search?.trim();

    return prisma.giftRequest.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(search
          ? {
              OR: [
                { requestNumber: { contains: search, mode: "insensitive" } },
                { senderName: { contains: search, mode: "insensitive" } },
                { senderEmail: { contains: search, mode: "insensitive" } },
                { recipientName: { contains: search, mode: "insensitive" } },
                { recipientCity: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: giftRequestSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  listForCustomer(input: { userId: string; senderEmail: string }) {
    return prisma.giftRequest.findMany({
      where: {
        OR: [{ userId: input.userId }, { senderEmail: input.senderEmail }],
      },
      select: giftRequestSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  findByIdForCustomer(
    id: string,
    input: { userId: string; senderEmail: string }
  ) {
    return prisma.giftRequest.findFirst({
      where: {
        id,
        OR: [{ userId: input.userId }, { senderEmail: input.senderEmail }],
      },
      select: giftRequestSelect,
    });
  }

  create(input: {
    requestNumber: string;
    userId?: string | null;
    senderName: string;
    senderEmail: string;
    senderPhone: string;
    recipientName: string;
    recipientPhone: string;
    recipientCity: string;
    recipientProvince?: string | null;
    recipientAddress: string;
    occasion?: string | null;
    preferredDeliveryDate?: string | null;
    itemType?: string | null;
    dressColor?: string | null;
    dressSize?: string | null;
    dressSleeveType?: string | null;
    dressLength?: string | null;
    dressFitting?: string | null;
    dressTexture?: string | null;
    dressForMale?: boolean;
    dressForFemale?: boolean;
    preparationNotes: string;
    deliveryInstructions: string;
    budgetNote?: string | null;
    imageUrls?: string[];
    videoUrls?: string[];
    status?: GiftRequestStatus;
  }) {
    return prisma.giftRequest.create({
      data: {
        requestNumber: input.requestNumber,
        userId: input.userId ?? null,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        senderPhone: input.senderPhone,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        recipientCity: input.recipientCity,
        recipientProvince: input.recipientProvince ?? null,
        recipientAddress: input.recipientAddress,
        occasion: input.occasion ?? null,
        preferredDeliveryDate: input.preferredDeliveryDate ?? null,
        itemType: input.itemType ?? null,
        dressColor: input.dressColor ?? null,
        dressSize: input.dressSize ?? null,
        dressSleeveType: input.dressSleeveType ?? null,
        dressLength: input.dressLength ?? null,
        dressFitting: input.dressFitting ?? null,
        dressTexture: input.dressTexture ?? null,
        dressForMale: input.dressForMale ?? false,
        dressForFemale: input.dressForFemale ?? false,
        preparationNotes: input.preparationNotes,
        deliveryInstructions: input.deliveryInstructions,
        budgetNote: input.budgetNote ?? null,
        imageUrls: input.imageUrls ?? [],
        videoUrls: input.videoUrls ?? [],
        status: input.status ?? "SUBMITTED",
      },
      select: giftRequestSelect,
    });
  }

  updateStatus(id: string, status: GiftRequestStatus) {
    return prisma.giftRequest.update({
      where: { id },
      data: { status },
      select: giftRequestSelect,
    });
  }

  updateQuote(
    id: string,
    input: {
      quoteAmountMinor: number;
      quoteCurrency: string;
      quoteNote?: string | null;
      quoteImageUrl: string;
      quoteSentAt: Date;
      status: GiftRequestStatus;
    }
  ) {
    return prisma.giftRequest.update({
      where: { id },
      data: {
        quoteAmountMinor: input.quoteAmountMinor,
        quoteCurrency: input.quoteCurrency,
        quoteNote: input.quoteNote ?? null,
        quoteImageUrl: input.quoteImageUrl,
        quoteSentAt: input.quoteSentAt,
        status: input.status,
      },
      select: giftRequestSelect,
    });
  }

  markPaid(
    id: string,
    input: {
      paidAt: Date;
      paidAmountMinor: number;
      paymentMethod: GiftRequestPaymentMethod;
      offlinePaymentNote?: string | null;
      stripePaymentIntentId?: string | null;
      status: GiftRequestStatus;
    }
  ) {
    return prisma.giftRequest.update({
      where: { id },
      data: {
        paidAt: input.paidAt,
        paidAmountMinor: input.paidAmountMinor,
        paymentMethod: input.paymentMethod,
        offlinePaymentNote: input.offlinePaymentNote ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        status: input.status,
      },
      select: giftRequestSelect,
    });
  }

  findByStripePaymentIntentId(stripePaymentIntentId: string) {
    return prisma.giftRequest.findFirst({
      where: { stripePaymentIntentId },
      select: giftRequestSelect,
    });
  }

  listPaidForReporting() {
    return prisma.giftRequest.findMany({
      where: {
        paidAt: { not: null },
        paidAmountMinor: { not: null },
      },
      select: {
        paidAt: true,
        paidAmountMinor: true,
        quoteCurrency: true,
      },
      orderBy: { paidAt: "desc" },
    });
  }
}

export type GiftRequestRecord = NonNullable<Awaited<ReturnType<GiftRequestRepository["findById"]>>>;
