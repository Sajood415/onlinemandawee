import type { SupplyRequestStatus } from "@prisma/client";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { notifyAdmins } from "@/lib/admin/notify-admins";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { SUPPLY_REQUEST_QUOTE_EXPIRY_HOURS } from "@/lib/supply/supply-request-constants";
import {
  assertSupplyRequestPaymentIntent,
  createSupplyRequestPaymentIntent,
} from "@/lib/supply/supply-request-payment";
import {
  sendSupplyRequestCancelledEmail,
  sendSupplyRequestCompletedEmail,
  sendSupplyRequestCreatedEmails,
  sendSupplyRequestExpiredEmail,
  sendSupplyRequestNeedsInfoEmail,
  sendSupplyRequestPaidEmail,
  sendSupplyRequestQuoteEmail,
  sendSupplyRequestRefundedEmail,
  sendSupplyRequestRejectedEmail,
  sendSupplyRequestShippedEmail,
} from "@/lib/mail/send-supply-request-emails";
import { StripeCheckoutPaymentError } from "@/lib/stripe/checkout-payment";
import { getStripeServerClient } from "@/lib/stripe/server";
import {
  SupplyRequestRepository,
  type SupplyRequestRecord,
} from "@/repositories/supply-request.repository";
import { generateOpaqueToken } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import type { CreateSupplyRequestInput } from "@/validators/supply-request.validator";

function serializeSupplyRequest(request: SupplyRequestRecord) {
  return {
    ...request,
    quoteSentAt: request.quoteSentAt?.toISOString() ?? null,
    quoteExpiresAt: request.quoteExpiresAt?.toISOString() ?? null,
    paidAt: request.paidAt?.toISOString() ?? null,
    refundedAt: request.refundedAt?.toISOString() ?? null,
    shippedAt: request.shippedAt?.toISOString() ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

type SerializedSupplyRequest = ReturnType<typeof serializeSupplyRequest>;

async function generateUniqueRequestNumber(repository: SupplyRequestRepository) {
  for (let i = 0; i < 20; i++) {
    const candidate = `SR-${generateOpaqueToken().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const existing = await repository.findByRequestNumber(candidate);
    if (!existing) return candidate;
  }
  throw new Error("Could not generate unique supply request number");
}

function quoteExpiresAtFromNow() {
  return new Date(Date.now() + SUPPLY_REQUEST_QUOTE_EXPIRY_HOURS * 60 * 60 * 1000);
}

const CLOSED_STATUSES: SupplyRequestStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "EXPIRED",
];

export class SupplyRequestService {
  constructor(
    private readonly supplyRequestRepository = new SupplyRequestRepository()
  ) {}

  private async expireIfNeeded(
    request: SupplyRequestRecord
  ): Promise<SupplyRequestRecord> {
    if (
      request.status === "AWAITING_PAYMENT" &&
      !request.paidAt &&
      request.quoteExpiresAt &&
      request.quoteExpiresAt.getTime() < Date.now()
    ) {
      const updated = await this.supplyRequestRepository.updateStatus(
        request.id,
        "EXPIRED"
      );
      void sendSupplyRequestExpiredEmail(updated);
      return updated;
    }
    return request;
  }

  private async loadAndExpire(id: string) {
    const existing = await this.supplyRequestRepository.findById(id);
    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    return this.expireIfNeeded(existing);
  }

  async create(input: CreateSupplyRequestInput, userId?: string | null) {
    const email = normalizeEmailForAuth(input.customerEmail);
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.supplyRequestRepository.countRecentByEmail(
      email,
      since
    );
    if (recent >= 5) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Too many supply requests. Please try again later.",
        statusCode: 429,
      });
    }

    const requestNumber = await generateUniqueRequestNumber(
      this.supplyRequestRepository
    );
    const guestTrackingToken = generateOpaqueToken().replace(/-/g, "");

    const supplyRequest = await this.supplyRequestRepository.create({
      requestNumber,
      guestTrackingToken,
      userId: userId ?? null,
      productName: input.productName.trim(),
      brand: input.brand,
      modelSku: input.modelSku,
      quantity: input.quantity,
      description: input.description.trim(),
      referenceUrls: input.referenceUrls,
      imageUrls: input.imageUrls,
      categoryHint: input.categoryHint,
      budgetMinMinor: input.budgetMinMinor,
      budgetMaxMinor: input.budgetMaxMinor,
      budgetCurrency: input.budgetCurrency,
      neededByDate: input.neededByDate,
      urgencyNote: input.urgencyNote,
      allowAlternatives: input.allowAlternatives,
      deliveryMode: input.deliveryMode,
      customerName: input.customerName.trim(),
      customerEmail: email,
      customerPhone: input.customerPhone.trim(),
      whatsapp: input.whatsapp,
      preferredContact: input.preferredContact,
      city: input.city.trim(),
      province: input.province,
      address: input.address,
    });

    void sendSupplyRequestCreatedEmails(supplyRequest);
    void notifyAdmins({
      type: "SUPPLY_REQUEST_CREATED",
      title: "New Product Supply Request",
      body: `${supplyRequest.requestNumber}: ${supplyRequest.productName}`,
      href: `/admin/supply-requests`,
      entityType: "SupplyRequest",
      entityId: supplyRequest.id,
    });

    return serializeSupplyRequest(supplyRequest);
  }

  async listForAdmin(filters?: { status?: SupplyRequestStatus; search?: string }) {
    const rows = await this.supplyRequestRepository.list(filters);
    const expired = await Promise.all(rows.map((row) => this.expireIfNeeded(row)));
    return expired.map(serializeSupplyRequest);
  }

  async getForAdmin(id: string) {
    const request = await this.loadAndExpire(id);
    if (request.status === "SUBMITTED") {
      const reviewing = await this.supplyRequestRepository.updateStatus(
        id,
        "REVIEWING"
      );
      return serializeSupplyRequest(reviewing);
    }
    return serializeSupplyRequest(request);
  }

  async updateStatusForAdmin(id: string, status: SupplyRequestStatus) {
    const existing = await this.loadAndExpire(id);

    if (status === "COMPLETED") {
      if (!existing.paidAt) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Cannot mark as completed before payment is received",
          statusCode: 400,
        });
      }
      if (existing.deliveryMode === "SHIP" && !existing.trackingRef) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Add tracking before completing a shipped request",
          statusCode: 400,
        });
      }
      const updated = await this.supplyRequestRepository.update(id, {
        status: "COMPLETED",
        completedAt: new Date(),
      });
      void sendSupplyRequestCompletedEmail(updated);
      return serializeSupplyRequest(updated);
    }

    if (status === "CANCELLED") {
      if (existing.paidAt && !existing.refundedAt) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Refund this paid request before cancelling",
          statusCode: 400,
        });
      }
      const updated = await this.supplyRequestRepository.updateStatus(
        id,
        "CANCELLED"
      );
      void sendSupplyRequestCancelledEmail(updated);
      return serializeSupplyRequest(updated);
    }

    if (status === "REVIEWING" || status === "IN_PROGRESS" || status === "SHIPPED") {
      const updated = await this.supplyRequestRepository.updateStatus(id, status);
      return serializeSupplyRequest(updated);
    }

    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "Use the dedicated actions for quote, reject, ship, or refund",
      statusCode: 400,
    });
  }

  async rejectForAdmin(id: string, rejectReason: string) {
    const existing = await this.loadAndExpire(id);
    if (existing.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cannot reject a paid request; refund instead",
        statusCode: 400,
      });
    }
    if (CLOSED_STATUSES.includes(existing.status)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This supply request is already closed",
        statusCode: 400,
      });
    }

    const updated = await this.supplyRequestRepository.update(id, {
      status: "REJECTED",
      rejectReason: rejectReason.trim(),
    });
    void sendSupplyRequestRejectedEmail(updated);
    return serializeSupplyRequest(updated);
  }

  async sendQuoteForAdmin(
    id: string,
    input: {
      quoteAmountMinor: number;
      quoteCurrency: string;
      quoteNote?: string | null;
      quoteImageUrl?: string | null;
    }
  ) {
    const existing = await this.loadAndExpire(id);

    if (existing.paidAt || CLOSED_STATUSES.includes(existing.status)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cannot send a quote for a closed or paid supply request",
        statusCode: 400,
      });
    }

    const updated = await this.supplyRequestRepository.updateQuote(id, {
      quoteAmountMinor: input.quoteAmountMinor,
      quoteCurrency: input.quoteCurrency,
      quoteNote: input.quoteNote ?? null,
      quoteImageUrl: input.quoteImageUrl ?? null,
      quoteSentAt: new Date(),
      quoteExpiresAt: quoteExpiresAtFromNow(),
      stripePaymentIntentId: null,
      status: "AWAITING_PAYMENT",
    });

    void sendSupplyRequestQuoteEmail(updated);
    void notifyAdmins({
      type: "SUPPLY_REQUEST_QUOTED",
      title: "Product Supply Request quoted",
      body: `${updated.requestNumber} quote sent.`,
      href: `/admin/supply-requests`,
      entityType: "SupplyRequest",
      entityId: updated.id,
    });

    return serializeSupplyRequest(updated);
  }

  async markPaidOfflineForAdmin(id: string, offlinePaymentNote?: string | null) {
    const existing = await this.loadAndExpire(id);

    if (!existing.quoteAmountMinor || !existing.quoteCurrency) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Send a quote before marking payment received",
        statusCode: 400,
      });
    }

    if (existing.status === "EXPIRED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This quote has expired",
        statusCode: 400,
      });
    }

    if (existing.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This supply request is already paid",
        statusCode: 400,
      });
    }

    const updated = await this.supplyRequestRepository.markPaid(id, {
      paidAt: new Date(),
      paidAmountMinor: existing.quoteAmountMinor,
      paymentMethod: "OFFLINE",
      offlinePaymentNote: offlinePaymentNote ?? null,
      status: "IN_PROGRESS",
    });

    void sendSupplyRequestPaidEmail(updated);
    void notifyAdmins({
      type: "SUPPLY_REQUEST_PAID",
      title: "Product Supply Request paid",
      body: `${updated.requestNumber} is paid and ready for fulfillment.`,
      href: `/admin/supply-requests`,
      entityType: "SupplyRequest",
      entityId: updated.id,
    });

    return serializeSupplyRequest(updated);
  }

  async shipForAdmin(
    id: string,
    input: { trackingRef: string; carrierNote?: string | null }
  ) {
    const existing = await this.loadAndExpire(id);
    if (!existing.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cannot ship before payment",
        statusCode: 400,
      });
    }
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cannot ship a closed supply request",
        statusCode: 400,
      });
    }

    const updated = await this.supplyRequestRepository.update(id, {
      trackingRef: input.trackingRef.trim(),
      carrierNote: input.carrierNote?.trim() || null,
      shippedAt: new Date(),
      status: "SHIPPED",
    });

    void sendSupplyRequestShippedEmail(updated);
    void notifyAdmins({
      type: "SUPPLY_REQUEST_SHIPPED",
      title: "Product Supply Request shipped",
      body: `${updated.requestNumber} tracking ${updated.trackingRef}.`,
      href: `/admin/supply-requests`,
      entityType: "SupplyRequest",
      entityId: updated.id,
    });

    return serializeSupplyRequest(updated);
  }

  async refundForAdmin(
    id: string,
    input: { refundAmountMinor: number; refundNote: string }
  ) {
    const existing = await this.loadAndExpire(id);
    if (!existing.paidAt || !existing.paidAmountMinor) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Nothing to refund",
        statusCode: 400,
      });
    }

    const alreadyRefunded = existing.refundAmountMinor ?? 0;
    const remaining = existing.paidAmountMinor - alreadyRefunded;
    if (input.refundAmountMinor > remaining) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refund amount exceeds remaining paid amount",
        statusCode: 400,
      });
    }

    let stripeRefundId: string | null = existing.stripeRefundId;
    if (existing.paymentMethod === "STRIPE" && existing.stripePaymentIntentId) {
      const stripe = getStripeServerClient();
      const refund = await stripe.refunds.create({
        payment_intent: existing.stripePaymentIntentId,
        amount: input.refundAmountMinor,
      });
      stripeRefundId = refund.id;
    }

    const totalRefunded = alreadyRefunded + input.refundAmountMinor;
    const isFull = totalRefunded >= existing.paidAmountMinor;

    const updated = await this.supplyRequestRepository.update(id, {
      refundedAt: new Date(),
      refundAmountMinor: totalRefunded,
      refundNote: input.refundNote.trim(),
      stripeRefundId,
      ...(isFull
        ? { status: "CANCELLED" as SupplyRequestStatus }
        : {}),
    });

    void sendSupplyRequestRefundedEmail(updated);
    if (isFull) {
      void sendSupplyRequestCancelledEmail(updated);
    }

    return serializeSupplyRequest(updated);
  }

  async requestInfoForAdmin(id: string, message: string) {
    const existing = await this.loadAndExpire(id);
    if (CLOSED_STATUSES.includes(existing.status) || existing.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cannot request info on this supply request",
        statusCode: 400,
      });
    }

    const updated = await this.supplyRequestRepository.update(id, {
      adminNote: message.trim(),
      status: existing.status === "SUBMITTED" ? "REVIEWING" : existing.status,
    });

    void sendSupplyRequestNeedsInfoEmail(updated, message.trim());
    return serializeSupplyRequest(updated);
  }

  private customerScope(auth: AuthenticatedUser) {
    return {
      userId: auth.id,
      customerEmail: normalizeEmailForAuth(auth.email),
    };
  }

  async listForCustomer(auth: AuthenticatedUser) {
    const scope = this.customerScope(auth);
    await this.supplyRequestRepository.linkGuestRequestsToUser(
      scope.userId,
      scope.customerEmail
    );
    const rows = await this.supplyRequestRepository.listForCustomer(scope);
    const expired = await Promise.all(rows.map((row) => this.expireIfNeeded(row)));
    return expired.map(serializeSupplyRequest);
  }

  async getForCustomer(auth: AuthenticatedUser, id: string) {
    const request = await this.supplyRequestRepository.findByIdForCustomer(
      id,
      this.customerScope(auth)
    );
    if (!request) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    return serializeSupplyRequest(await this.expireIfNeeded(request));
  }

  async getByTrackToken(token: string) {
    const request = await this.supplyRequestRepository.findByGuestTrackingToken(
      token.trim()
    );
    if (!request) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    return serializeSupplyRequest(await this.expireIfNeeded(request));
  }

  private assertCancellable(request: SupplyRequestRecord) {
    if (request.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Paid requests cannot be cancelled by the customer",
        statusCode: 400,
      });
    }
    if (
      !["SUBMITTED", "REVIEWING", "AWAITING_PAYMENT"].includes(request.status)
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This supply request cannot be cancelled",
        statusCode: 400,
      });
    }
  }

  async cancelForCustomer(auth: AuthenticatedUser, id: string) {
    const request = await this.supplyRequestRepository.findByIdForCustomer(
      id,
      this.customerScope(auth)
    );
    if (!request) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    const current = await this.expireIfNeeded(request);
    this.assertCancellable(current);
    const updated = await this.supplyRequestRepository.updateStatus(
      id,
      "CANCELLED"
    );
    void sendSupplyRequestCancelledEmail(updated);
    return serializeSupplyRequest(updated);
  }

  async cancelByTrackToken(token: string) {
    const request = await this.supplyRequestRepository.findByGuestTrackingToken(
      token.trim()
    );
    if (!request) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    const current = await this.expireIfNeeded(request);
    this.assertCancellable(current);
    const updated = await this.supplyRequestRepository.updateStatus(
      current.id,
      "CANCELLED"
    );
    void sendSupplyRequestCancelledEmail(updated);
    return serializeSupplyRequest(updated);
  }

  private async requirePayable(request: SupplyRequestRecord) {
    const current = await this.expireIfNeeded(request);

    if (current.status === "EXPIRED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This quote has expired",
        statusCode: 400,
      });
    }

    if (current.status !== "AWAITING_PAYMENT") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This supply request is not awaiting payment",
        statusCode: 400,
      });
    }

    if (!current.quoteAmountMinor || !current.quoteCurrency) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment quote is not available yet",
        statusCode: 400,
      });
    }

    if (current.paidAt) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This supply request is already paid",
        statusCode: 400,
      });
    }

    return current;
  }

  private async createPaymentIntentForRequest(request: SupplyRequestRecord) {
    const payable = await this.requirePayable(request);
    const quoteAmountMinor = payable.quoteAmountMinor!;
    const quoteCurrency = payable.quoteCurrency!;

    try {
      const paymentIntent = await createSupplyRequestPaymentIntent({
        supplyRequestId: payable.id,
        requestNumber: payable.requestNumber,
        quoteAmountMinor,
        quoteCurrency,
      });

      await this.supplyRequestRepository.update(payable.id, {
        stripePaymentIntentId: paymentIntent.id,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        quoteAmountMinor,
        quoteCurrency,
        quoteNote: payable.quoteNote,
        quoteImageUrl: payable.quoteImageUrl,
        requestNumber: payable.requestNumber,
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

  private async confirmPaymentForRequest(
    request: SupplyRequestRecord,
    paymentIntentId: string
  ): Promise<SerializedSupplyRequest> {
    const payable = await this.requirePayable(request);
    const quoteAmountMinor = payable.quoteAmountMinor!;
    const quoteCurrency = payable.quoteCurrency!;

    const existingPaid =
      await this.supplyRequestRepository.findByStripePaymentIntentId(
        paymentIntentId
      );
    if (existingPaid) {
      return serializeSupplyRequest(existingPaid);
    }

    if (payable.paidAt && payable.status === "IN_PROGRESS") {
      return serializeSupplyRequest(payable);
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

    if (paymentIntent.metadata.supplyRequestId !== payable.id) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment does not match this supply request",
        statusCode: 400,
      });
    }

    try {
      assertSupplyRequestPaymentIntent(paymentIntent, {
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

    const updated = await this.supplyRequestRepository.markPaid(payable.id, {
      paidAt: new Date(),
      paidAmountMinor: quoteAmountMinor,
      paymentMethod: "STRIPE",
      stripePaymentIntentId: paymentIntentId,
      status: "IN_PROGRESS",
    });

    void sendSupplyRequestPaidEmail(updated);
    void notifyAdmins({
      type: "SUPPLY_REQUEST_PAID",
      title: "Product Supply Request paid",
      body: `${updated.requestNumber} is paid and ready for fulfillment.`,
      href: `/admin/supply-requests`,
      entityType: "SupplyRequest",
      entityId: updated.id,
    });

    return serializeSupplyRequest(updated);
  }

  async createPaymentIntentForCustomer(auth: AuthenticatedUser, id: string) {
    const request = await this.supplyRequestRepository.findByIdForCustomer(
      id,
      this.customerScope(auth)
    );
    if (!request) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    return this.createPaymentIntentForRequest(request);
  }

  async confirmPaymentForCustomer(
    auth: AuthenticatedUser,
    id: string,
    paymentIntentId: string
  ) {
    const request = await this.supplyRequestRepository.findByIdForCustomer(
      id,
      this.customerScope(auth)
    );
    if (!request) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    return this.confirmPaymentForRequest(request, paymentIntentId);
  }

  async createPaymentIntentByTrackToken(token: string) {
    const request = await this.supplyRequestRepository.findByGuestTrackingToken(
      token.trim()
    );
    if (!request) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    return this.createPaymentIntentForRequest(request);
  }

  async confirmPaymentByTrackToken(token: string, paymentIntentId: string) {
    const request = await this.supplyRequestRepository.findByGuestTrackingToken(
      token.trim()
    );
    if (!request) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Supply request not found",
        statusCode: 404,
      });
    }
    return this.confirmPaymentForRequest(request, paymentIntentId);
  }
}
