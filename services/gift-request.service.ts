import type { GiftRequestStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  assertGiftRequestPaymentIntent,
  createGiftRequestPaymentIntent,
} from "@/lib/gifts/gift-request-payment";
import {
  sendGiftRequestEmails,
  sendGiftRequestQuoteEmail,
} from "@/lib/mail/send-gift-request-emails";
import { StripeCheckoutPaymentError } from "@/lib/stripe/checkout-payment";
import { getStripeServerClient } from "@/lib/stripe/server";
import {
  GiftRequestRepository,
  type GiftRequestRecord,
} from "@/repositories/gift-request.repository";
import { generateOpaqueToken } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import type { CreateGiftRequestInput } from "@/validators/gift-request.validator";

function serializeGiftRequest(request: GiftRequestRecord) {
  return {
    ...request,
    quoteSentAt: request.quoteSentAt?.toISOString() ?? null,
    paidAt: request.paidAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

async function generateUniqueRequestNumber(repository: GiftRequestRepository) {
  for (let i = 0; i < 20; i++) {
    const candidate = `GR-${generateOpaqueToken().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const existing = await repository.findByRequestNumber(candidate);
    if (!existing) return candidate;
  }
  throw new Error("Could not generate unique gift request number");
}

export class GiftRequestService {
  constructor(private readonly giftRequestRepository = new GiftRequestRepository()) {}

  async create(input: CreateGiftRequestInput, userId?: string | null) {
    const requestNumber = await generateUniqueRequestNumber(this.giftRequestRepository);

    const giftRequest = await this.giftRequestRepository.create({
      requestNumber,
      userId: userId ?? null,
      senderName: input.senderName.trim(),
      senderEmail: normalizeEmailForAuth(input.senderEmail),
      senderPhone: input.senderPhone.trim(),
      recipientName: input.recipientName.trim(),
      recipientPhone: input.recipientPhone.trim(),
      recipientCity: input.recipientCity.trim(),
      recipientProvince: input.recipientProvince?.trim() || null,
      recipientAddress: input.recipientAddress.trim(),
      occasion: input.occasion?.trim() || null,
      preferredDeliveryDate: input.preferredDeliveryDate?.trim() || null,
      itemType: input.itemType?.trim() || null,
      dressColor: input.dressColor?.trim() || null,
      dressSize: input.dressSize?.trim() || null,
      dressSleeveType: input.dressSleeveType?.trim() || null,
      dressLength: input.dressLength?.trim() || null,
      dressFitting: input.dressFitting?.trim() || null,
      dressTexture: input.dressTexture?.trim() || null,
      dressForMale: input.dressForMale ?? false,
      dressForFemale: input.dressForFemale ?? false,
      preparationNotes: input.preparationNotes.trim(),
      deliveryInstructions: input.deliveryInstructions.trim(),
      budgetNote: input.budgetNote?.trim() || null,
      imageUrls: input.imageUrls ?? [],
      videoUrls: input.videoUrls ?? [],
    });

    void sendGiftRequestEmails(giftRequest);

    return serializeGiftRequest(giftRequest);
  }

  listForAdmin(filters?: { status?: GiftRequestStatus; search?: string }) {
    return this.giftRequestRepository
      .list(filters)
      .then((rows) => rows.map(serializeGiftRequest));
  }

  async getForAdmin(id: string) {
    const giftRequest = await this.giftRequestRepository.findById(id);
    if (!giftRequest) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Gift request not found",
        statusCode: 404,
      });
    }
    return serializeGiftRequest(giftRequest);
  }

  async updateStatusForAdmin(id: string, status: GiftRequestStatus) {
    const existing = await this.getForAdmin(id);

    if (status === "COMPLETED" && !existing.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cannot mark as completed before payment is received",
        statusCode: 400,
      });
    }

    const updated = await this.giftRequestRepository.updateStatus(id, status);
    return serializeGiftRequest(updated);
  }

  async sendQuoteForAdmin(
    id: string,
    input: {
      quoteAmountMinor: number;
      quoteCurrency: string;
      quoteNote?: string | null;
      quoteImageUrl: string;
    }
  ) {
    const existing = await this.getForAdmin(id);

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cannot send a quote for a closed gift request",
        statusCode: 400,
      });
    }

    const updated = await this.giftRequestRepository.updateQuote(id, {
      quoteAmountMinor: input.quoteAmountMinor,
      quoteCurrency: input.quoteCurrency,
      quoteNote: input.quoteNote ?? null,
      quoteImageUrl: input.quoteImageUrl,
      quoteSentAt: new Date(),
      status: "AWAITING_PAYMENT",
    });

    void sendGiftRequestQuoteEmail(updated);

    return serializeGiftRequest(updated);
  }

  async markPaidOfflineForAdmin(id: string, offlinePaymentNote?: string | null) {
    const existing = await this.getForAdmin(id);

    if (!existing.quoteAmountMinor || !existing.quoteCurrency) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Send a quote before marking payment received",
        statusCode: 400,
      });
    }

    if (existing.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This gift request is already paid",
        statusCode: 400,
      });
    }

    const updated = await this.giftRequestRepository.markPaid(id, {
      paidAt: new Date(),
      paidAmountMinor: existing.quoteAmountMinor,
      paymentMethod: "OFFLINE",
      offlinePaymentNote: offlinePaymentNote ?? null,
      status: "IN_PROGRESS",
    });

    return serializeGiftRequest(updated);
  }

  private async requirePayableGiftRequest(auth: AuthenticatedUser, id: string) {
    const giftRequest = await this.giftRequestRepository.findByIdForCustomer(
      id,
      this.customerScope(auth)
    );

    if (!giftRequest) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Gift request not found",
        statusCode: 404,
      });
    }

    if (giftRequest.status !== "AWAITING_PAYMENT") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This gift request is not awaiting payment",
        statusCode: 400,
      });
    }

    if (!giftRequest.quoteAmountMinor || !giftRequest.quoteCurrency) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment quote is not available yet",
        statusCode: 400,
      });
    }

    if (giftRequest.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This gift request is already paid",
        statusCode: 400,
      });
    }

    return giftRequest;
  }

  async createPaymentIntentForCustomer(auth: AuthenticatedUser, id: string) {
    const giftRequest = await this.requirePayableGiftRequest(auth, id);
    const quoteAmountMinor = giftRequest.quoteAmountMinor!;
    const quoteCurrency = giftRequest.quoteCurrency!;

    try {
      const paymentIntent = await createGiftRequestPaymentIntent({
        giftRequestId: giftRequest.id,
        requestNumber: giftRequest.requestNumber,
        quoteAmountMinor,
        quoteCurrency,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        quoteAmountMinor,
        quoteCurrency,
        quoteNote: giftRequest.quoteNote,
        quoteImageUrl: giftRequest.quoteImageUrl,
        requestNumber: giftRequest.requestNumber,
      };
    } catch (error) {
      if (error instanceof StripeCheckoutPaymentError) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: error.message,
          statusCode: error.status,
        });
      }
      throw error;
    }
  }

  async confirmPaymentForCustomer(
    auth: AuthenticatedUser,
    id: string,
    paymentIntentId: string
  ) {
    const giftRequest = await this.requirePayableGiftRequest(auth, id);
    const quoteAmountMinor = giftRequest.quoteAmountMinor!;
    const quoteCurrency = giftRequest.quoteCurrency!;

    const existingPaid = await this.giftRequestRepository.findByStripePaymentIntentId(
      paymentIntentId
    );
    if (existingPaid) {
      return serializeGiftRequest(existingPaid);
    }

    const stripe = getStripeServerClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment has not been completed",
        statusCode: 400,
      });
    }

    if (paymentIntent.metadata.giftRequestId !== giftRequest.id) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment does not match this gift request",
        statusCode: 400,
      });
    }

    try {
      assertGiftRequestPaymentIntent(paymentIntent, {
        quoteAmountMinor,
        quoteCurrency,
      });
    } catch (error) {
      if (error instanceof StripeCheckoutPaymentError) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: error.message,
          statusCode: error.status,
        });
      }
      throw error;
    }

    const updated = await this.giftRequestRepository.markPaid(id, {
      paidAt: new Date(),
      paidAmountMinor: quoteAmountMinor,
      paymentMethod: "STRIPE",
      stripePaymentIntentId: paymentIntentId,
      status: "IN_PROGRESS",
    });

    return serializeGiftRequest(updated);
  }

  private customerScope(auth: AuthenticatedUser) {
    return {
      userId: auth.id,
      senderEmail: normalizeEmailForAuth(auth.email),
    };
  }

  listForCustomer(auth: AuthenticatedUser) {
    return this.giftRequestRepository
      .listForCustomer(this.customerScope(auth))
      .then((rows) => rows.map(serializeGiftRequest));
  }

  async getForCustomer(auth: AuthenticatedUser, id: string) {
    const giftRequest = await this.giftRequestRepository.findByIdForCustomer(
      id,
      this.customerScope(auth)
    );
    if (!giftRequest) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Gift request not found",
        statusCode: 404,
      });
    }
    return serializeGiftRequest(giftRequest);
  }
}
