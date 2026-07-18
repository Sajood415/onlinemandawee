import { Prisma } from "@prisma/client";

import { env } from "@/config/env.shared";
import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { disputeRoomName } from "@/domain/realtime/dispute-events";
import type { PaymentStatus } from "@/domain/order/order-status";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { prisma } from "@/lib/db/prisma";
import { getRefundEligibility } from "@/lib/refunds/refund-eligibility";
import {
  canCustomerOpenRefundCase,
} from "@/lib/refunds/refund-request-eligibility";
import {
  sendRefundDecisionEmails,
  sendRefundEscalatedAdminEmail,
  sendRefundOpenedCustomerEmail,
  sendRefundOpenedVendorEmail,
  sendRefundOverdueEscalationSummaryEmail,
} from "@/lib/mail/send-refund-emails";
import { emitDisputeUpdated } from "@/lib/realtime/emit-dispute-updated";
import { publishDisputeEvent } from "@/lib/realtime/publish-dispute-event";
import { resolvePaymentStatusFromStripe } from "@/lib/orders/sync-payment-status-from-stripe";
import { durationFromNow } from "@/lib/utils/duration";
import { sha256 } from "@/lib/utils/crypto";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CaseMessageRepository } from "@/repositories/case-message.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { IdempotencyKeyRepository } from "@/repositories/idempotency-key.repository";
import {
  RefundCaseRepository,
  type RefundCaseListFilters,
} from "@/repositories/refund-case.repository";
import { RefundDecisionRepository } from "@/repositories/refund-decision.repository";
import { RefundEvidenceRepository } from "@/repositories/refund-evidence.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

type StripeRefundMetadata = {
  id: string;
  status: string;
  failureCode: string | null;
  failureReason: string | null;
  attemptedAt: Date;
};

export class RefundService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly refundCaseRepository = new RefundCaseRepository(),
    private readonly refundEvidenceRepository = new RefundEvidenceRepository(),
    private readonly refundDecisionRepository = new RefundDecisionRepository(),
    private readonly caseMessageRepository = new CaseMessageRepository(),
    private readonly payoutRepository = new PayoutRepository(),
    private readonly idempotencyKeyRepository = new IdempotencyKeyRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async requestRefund(
    auth: AuthenticatedUser,
    input: {
      orderItemId: string;
      reason: string;
      description?: string;
      requestedAmount: number;
      evidenceFileUrl?: string;
      evidenceNote?: string;
    }
  ) {
    this.assertActiveCustomer(auth);

    const orderItem = await this.orderRepository.findOrderItemById(input.orderItemId);

    if (!orderItem || orderItem.orderVendor.order.userId !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order item not found",
        statusCode: 404,
      });
    }

    if (
      !canCustomerOpenRefundCase({
        paymentStatus: orderItem.orderVendor.order.paymentStatus,
      })
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refunds are only allowed for paid orders",
        statusCode: 400,
      });
    }

    if (input.requestedAmount > orderItem.lineTotalAmount) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Requested amount exceeds order item total",
        statusCode: 400,
      });
    }

    const refundEligibility = getRefundEligibility({
      vendorOrderStatus: orderItem.orderVendor.status,
      deliveredAt: orderItem.orderVendor.deliveredAt,
      statusChangedAt: orderItem.orderVendor.updatedAt,
      windowDays: env.REFUND_WINDOW_DAYS,
    });

    if (refundEligibility === "not_yet_delivered") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refunds are only available after the order is marked delivered.",
        statusCode: 400,
      });
    }

    if (refundEligibility === "expired") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: `Refund period has expired. Refunds must be requested within ${env.REFUND_WINDOW_DAYS} days of delivery.`,
        statusCode: 400,
      });
    }

    const existingCases = await this.refundCaseRepository.listByOrderId(
      orderItem.orderVendor.orderId
    );
    const itemCases = existingCases.filter(
      (refundCase) => refundCase.orderItemId === orderItem.id
    );

    if (itemCases.some((refundCase) => refundCase.status !== "RESOLVED")) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "An active refund case already exists for this item",
        statusCode: 400,
      });
    }

    const approvedRefundTotal = itemCases.reduce((sum, refundCase) => {
      return sum + (refundCase.decision?.approvedAmount ?? 0);
    }, 0);

    if (approvedRefundTotal + input.requestedAmount > orderItem.lineTotalAmount) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Requested amount exceeds remaining refundable amount",
        statusCode: 400,
      });
    }

    const sellerType =
      orderItem.orderVendor.vendorProfile.sellerType ?? "THIRD_PARTY";
    const isPlatformShop = sellerType === "PLATFORM";
    const now = new Date();

    const refundCase = await this.refundCaseRepository
      .create({
        orderId: orderItem.orderVendor.orderId,
        orderItemId: orderItem.id,
        customerUserId: auth.id,
        vendorProfileId: orderItem.vendorProfileId,
        reason: input.reason,
        description: input.description,
        requestedAmount: input.requestedAmount,
        // PLATFORM (Mandawee shop) → admin queue. Outside vendors → vendor first.
        status: isPlatformShop ? "ESCALATED_ADMIN" : "WAITING_VENDOR",
        vendorResponseDueAt: isPlatformShop
          ? null
          : new Date(now.getTime() + 48 * 60 * 60 * 1000),
        escalatedAt: isPlatformShop ? now : null,
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AppError({
            code: ERROR_CODE.BAD_REQUEST,
            message: "An active refund case already exists for this item",
            statusCode: 400,
          });
        }
        throw error;
      });

    if (input.evidenceFileUrl || input.evidenceNote) {
      await this.refundEvidenceRepository.create({
        refundCaseId: refundCase.id,
        actorUserId: auth.id,
        actorRole: auth.role,
        fileUrl: input.evidenceFileUrl,
        note: input.evidenceNote,
      });
    }

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "refund.requested",
      entityType: "RefundCase",
      entityId: refundCase.id,
    });

    void emitDisputeUpdated({
      refundCaseId: refundCase.id,
      status: refundCase.status,
      updatedAt: refundCase.updatedAt,
    });

    const serialized = await this.getRefundCase(auth, refundCase.id);
    void this.notifyRefundOpened(serialized);
    return serialized;
  }

  async listMyCases(
    auth: AuthenticatedUser,
    filters: Omit<RefundCaseListFilters, "customerUserId" | "vendorProfileId">
  ) {
    this.assertActiveCustomer(auth);
    return this.listCases({
      ...filters,
      customerUserId: auth.id,
    });
  }

  async listVendorCases(
    auth: AuthenticatedUser,
    filters: Omit<RefundCaseListFilters, "customerUserId" | "vendorProfileId">
  ) {
    if (auth.role !== "VENDOR") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only vendors can list vendor refund cases",
        statusCode: 403,
      });
    }

    const vendor = await this.vendorProfileRepository.findByUserId(auth.id);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    return this.listCases({
      ...filters,
      vendorProfileId: vendor.id,
    });
  }

  async listAdminCases(auth: AuthenticatedUser, filters: RefundCaseListFilters) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can list all refund cases",
        statusCode: 403,
      });
    }

    return this.listCases(filters);
  }

  private async listCases(filters: RefundCaseListFilters) {
    const [total, cases] = await Promise.all([
      this.refundCaseRepository.countWithFilters(filters),
      this.refundCaseRepository.listWithFilters(filters),
    ]);

    return {
      items: cases.map((refundCase) => this.serializeRefundCaseListItem(refundCase)),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      },
    };
  }

  async getRefundCase(auth: AuthenticatedUser, refundCaseId: string) {
    const refundCase = await this.requireAccessibleCase(auth, refundCaseId);
    return this.serializeRefundCase(refundCase);
  }

  async vendorRespond(
    auth: AuthenticatedUser,
    refundCaseId: string,
    input: {
      action: "ACCEPT" | "REJECT";
      explanation: string;
      evidenceFileUrl?: string;
      evidenceNote?: string;
    }
  ) {
    const refundCase = await this.requireAccessibleCase(auth, refundCaseId);

    if (auth.role !== "VENDOR") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only vendors can respond to refund cases",
        statusCode: 403,
      });
    }

    if (refundCase.status !== "WAITING_VENDOR") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refund case is not waiting for vendor response",
        statusCode: 400,
      });
    }

    if (refundCase.orderItem.orderVendor.vendorProfile.user.id !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Vendor cannot respond to this refund case",
        statusCode: 403,
      });
    }

    if (refundCase.orderItem.orderVendor.vendorProfile.sellerType === "PLATFORM") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Mandawee shop refunds are handled by admin, not the vendor response form",
        statusCode: 400,
      });
    }

    if (input.evidenceFileUrl || input.evidenceNote) {
      await this.refundEvidenceRepository.create({
        refundCaseId,
        actorUserId: auth.id,
        actorRole: auth.role,
        fileUrl: input.evidenceFileUrl,
        note: input.evidenceNote,
      });
    }

    if (input.action === "ACCEPT") {
      try {
        await this.refundDecisionRepository.create({
          refundCaseId,
          decisionType: "APPROVE",
          approvedAmount: refundCase.requestedAmount,
          reason: input.explanation,
          decidedByUserId: auth.id,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AppError({
            code: ERROR_CODE.BAD_REQUEST,
            message: "Refund case is already resolved",
            statusCode: 400,
          });
        }
        throw error;
      }

      let stripeRefund: StripeRefundMetadata;
      try {
        stripeRefund = await this.executeStripeRefund({
          refundCase,
          approvedAmount: refundCase.requestedAmount,
        });
      } catch (error) {
        await this.refundDecisionRepository.deleteByRefundCaseId(refundCaseId);
        throw error;
      }

      await this.refundDecisionRepository.updateStripeMetadata({
        refundCaseId,
        stripeRefundId: stripeRefund.id,
        stripeRefundStatus: stripeRefund.status,
        stripeRefundFailureCode: stripeRefund.failureCode ?? undefined,
        stripeRefundFailureReason: stripeRefund.failureReason ?? undefined,
        stripeRefundAttemptedAt: stripeRefund.attemptedAt,
      });

      const updated = await this.refundCaseRepository.update({
        id: refundCaseId,
        status: "RESOLVED",
        vendorExplanation: `${input.action}: ${input.explanation}`,
        finalDecisionAt: new Date(),
        vendorResponseDueAt: null,
      });

      await this.applyRefundFinancials(
        refundCaseId,
        updated.orderId,
        updated.orderItem.orderVendorId,
        updated.vendorProfileId,
        updated.requestedAmount,
        updated.order.currency
      );
      await this.syncOrderPaymentStatus(updated.orderId);

      await this.auditLogRepository.create({
        actorUserId: auth.id,
        actorRole: auth.role,
        action: "refund.vendor_responded",
        entityType: "RefundCase",
        entityId: refundCaseId,
        metadata: {
          action: input.action,
        },
      });

      void emitDisputeUpdated({
        refundCaseId: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      });

      const serialized = this.serializeRefundCase(updated);
      void sendRefundDecisionEmails(this.toRefundEmailCase(serialized));
      return serialized;
    }

    // Outside vendors: decline is final — do not send to Mandawee.
    try {
      await this.refundDecisionRepository.create({
        refundCaseId,
        decisionType: "REJECT",
        approvedAmount: 0,
        reason: input.explanation,
        decidedByUserId: auth.id,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Refund case is already resolved",
          statusCode: 400,
        });
      }
      throw error;
    }

    const updated = await this.refundCaseRepository.update({
      id: refundCaseId,
      status: "RESOLVED",
      vendorExplanation: `${input.action}: ${input.explanation}`,
      finalDecisionAt: new Date(),
      vendorResponseDueAt: null,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "refund.vendor_responded",
      entityType: "RefundCase",
      entityId: refundCaseId,
      metadata: {
        action: input.action,
      },
    });

    void emitDisputeUpdated({
      refundCaseId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });

    const serialized = this.serializeRefundCase(updated);
    void sendRefundDecisionEmails(this.toRefundEmailCase(serialized));
    return serialized;
  }

  async escalate(auth: AuthenticatedUser, refundCaseId: string) {
    const refundCase = await this.requireAccessibleCase(auth, refundCaseId);

    if (auth.role !== "CUSTOMER" && auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only customers or admins can escalate refund cases",
        statusCode: 403,
      });
    }

    if (refundCase.status === "RESOLVED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Resolved refund case cannot be escalated",
        statusCode: 400,
      });
    }

    const sellerType =
      refundCase.orderItem.orderVendor.vendorProfile.sellerType ?? "THIRD_PARTY";

    // Outside-vendor products stay with the vendor — customers cannot escalate to Mandawee.
    if (auth.role === "CUSTOMER" && sellerType === "THIRD_PARTY") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message:
          "For outside seller products, contact the vendor about this refund. Mandawee only handles refunds for its own shop.",
        statusCode: 403,
      });
    }

    if (refundCase.status === "ESCALATED_ADMIN") {
      return this.serializeRefundCase(refundCase);
    }

    const updated = await this.refundCaseRepository.update({
      id: refundCaseId,
      status: "ESCALATED_ADMIN",
      escalatedAt: new Date(),
      vendorResponseDueAt: null,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "refund.escalated",
      entityType: "RefundCase",
      entityId: refundCaseId,
    });

    void emitDisputeUpdated({
      refundCaseId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });

    const serialized = this.serializeRefundCase(updated);
    void sendRefundEscalatedAdminEmail(this.toRefundEmailCase(serialized));
    return serialized;
  }

  async adminUpdateStatus(
    auth: AuthenticatedUser,
    refundCaseId: string,
    status: "REQUESTED" | "WAITING_VENDOR" | "ESCALATED_ADMIN" | "RESOLVED"
  ) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can update dispute status",
        statusCode: 403,
      });
    }

    const refundCase = await this.refundCaseRepository.findById(refundCaseId);

    if (!refundCase) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Refund case not found",
        statusCode: 404,
      });
    }

    if (refundCase.status === status) {
      return this.serializeRefundCase(refundCase);
    }

    const now = new Date();
    const update: Parameters<RefundCaseRepository["update"]>[0] = {
      id: refundCaseId,
      status,
    };

    const reopeningFromResolved = refundCase.status === "RESOLVED" && status !== "RESOLVED";

    if (status === "REQUESTED") {
      update.vendorResponseDueAt = null;
      update.escalatedAt = null;
      update.finalDecisionAt = null;
      if (reopeningFromResolved) {
        update.activeOrderItemKey = refundCase.orderItemId;
      }
    } else if (status === "WAITING_VENDOR") {
      update.vendorResponseDueAt =
        refundCase.vendorResponseDueAt ?? new Date(now.getTime() + 48 * 60 * 60 * 1000);
      update.escalatedAt = null;
      update.finalDecisionAt = null;
      if (reopeningFromResolved) {
        update.activeOrderItemKey = refundCase.orderItemId;
      }
    } else if (status === "ESCALATED_ADMIN") {
      update.escalatedAt = refundCase.escalatedAt ?? now;
      update.vendorResponseDueAt = null;
      update.finalDecisionAt = null;
      if (reopeningFromResolved) {
        update.activeOrderItemKey = refundCase.orderItemId;
      }
    } else {
      update.finalDecisionAt = refundCase.finalDecisionAt ?? now;
      update.vendorResponseDueAt = null;
    }

    const updated = await this.refundCaseRepository.update(update);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "refund.admin_status_updated",
      entityType: "RefundCase",
      entityId: refundCaseId,
      metadata: {
        fromStatus: refundCase.status,
        toStatus: status,
      },
    });

    void emitDisputeUpdated({
      refundCaseId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });

    return this.serializeRefundCase(updated);
  }

  async adminUpdateDecision(
    auth: AuthenticatedUser,
    refundCaseId: string,
    input: {
      decisionType: "APPROVE" | "REJECT" | "PARTIAL";
      approvedAmount: number;
      reason?: string;
    }
  ) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can update dispute decisions",
        statusCode: 403,
      });
    }

    const refundCase = await this.refundCaseRepository.findById(refundCaseId);

    if (!refundCase) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Refund case not found",
        statusCode: 404,
      });
    }

    if (!refundCase.decision) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refund case has no decision to update",
        statusCode: 400,
      });
    }

    if (input.approvedAmount > refundCase.requestedAmount) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Approved amount exceeds requested amount",
        statusCode: 400,
      });
    }

    const decisionType =
      input.decisionType === "PARTIAL" &&
      input.approvedAmount >= refundCase.requestedAmount
        ? "APPROVE"
        : input.decisionType;

    const approvedAmount =
      decisionType === "REJECT"
        ? 0
        : decisionType === "APPROVE"
          ? refundCase.requestedAmount
          : input.approvedAmount;

    await this.refundDecisionRepository.updateDecision({
      refundCaseId,
      decisionType,
      approvedAmount,
      reason: input.reason?.trim() || refundCase.decision.reason,
    });

    const updated = await this.refundCaseRepository.findById(refundCaseId);
    if (!updated) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Refund case not found",
        statusCode: 404,
      });
    }

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "refund.admin_decision_updated",
      entityType: "RefundCase",
      entityId: refundCaseId,
      metadata: {
        fromDecisionType: refundCase.decision.decisionType,
        toDecisionType: decisionType,
        approvedAmount,
      },
    });

    void emitDisputeUpdated({
      refundCaseId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });

    return this.serializeRefundCase(updated);
  }

  async adminDecision(
    auth: AuthenticatedUser,
    refundCaseId: string,
    input: {
      decisionType: "APPROVE" | "REJECT" | "PARTIAL";
      approvedAmount: number;
      reason?: string;
    }
  ) {
    const refundCase = await this.requireAccessibleCase(auth, refundCaseId);

    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can decide refund cases",
        statusCode: 403,
      });
    }

    if (refundCase.status === "RESOLVED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refund case is already resolved",
        statusCode: 400,
      });
    }

    const sellerTypeForDecision =
      refundCase.orderItem.orderVendor.vendorProfile.sellerType ?? "THIRD_PARTY";
    if (
      sellerTypeForDecision === "THIRD_PARTY" &&
      refundCase.status === "WAITING_VENDOR"
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message:
          "Outside-vendor refunds must be handled by the vendor. Change status only for fraud/abuse cases before deciding.",
        statusCode: 400,
      });
    }

    if (refundCase.decision) {
      if (refundCase.status === "ESCALATED_ADMIN") {
        const repaired = await this.repairStuckRefundCaseIfNeeded(refundCase);
        return this.serializeRefundCase(repaired);
      }

      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refund case already has a decision",
        statusCode: 400,
      });
    }

    if (input.approvedAmount > refundCase.requestedAmount) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Approved amount exceeds requested amount",
        statusCode: 400,
      });
    }

    const decisionType =
      input.decisionType === "PARTIAL" &&
      input.approvedAmount >= refundCase.requestedAmount
        ? "APPROVE"
        : input.decisionType;

    try {
      await this.refundDecisionRepository.create({
        refundCaseId,
        decisionType,
        approvedAmount: input.approvedAmount,
        reason: input.reason,
        decidedByUserId: auth.id,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Refund case is already resolved",
          statusCode: 400,
        });
      }
      throw error;
    }

    const requiresStripeRefund =
      decisionType === "APPROVE" || decisionType === "PARTIAL";

    if (requiresStripeRefund) {
      let stripeRefund: StripeRefundMetadata;
      try {
        stripeRefund = await this.executeStripeRefund({
          refundCase,
          approvedAmount: input.approvedAmount,
        });
      } catch (error) {
        await this.refundDecisionRepository.deleteByRefundCaseId(refundCaseId);
        throw error;
      }

      await this.refundDecisionRepository.updateStripeMetadata({
        refundCaseId,
        stripeRefundId: stripeRefund.id,
        stripeRefundStatus: stripeRefund.status,
        stripeRefundFailureCode: stripeRefund.failureCode ?? undefined,
        stripeRefundFailureReason: stripeRefund.failureReason ?? undefined,
        stripeRefundAttemptedAt: stripeRefund.attemptedAt,
      });
    }

    let updated;
    try {
      updated = await this.refundCaseRepository.update({
        id: refundCaseId,
        status: "RESOLVED",
        finalDecisionAt: new Date(),
        vendorResponseDueAt: null,
      });
    } catch (error) {
      if (!requiresStripeRefund) {
        await this.refundDecisionRepository.deleteByRefundCaseId(refundCaseId);
      }
      throw error;
    }

    if (requiresStripeRefund) {
      await this.applyRefundFinancials(
        refundCaseId,
        updated.orderId,
        updated.orderItem.orderVendorId,
        updated.vendorProfileId,
        input.approvedAmount,
        updated.order.currency
      );
    }

    await this.syncOrderPaymentStatus(updated.orderId);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "refund.admin_decided",
      entityType: "RefundCase",
      entityId: refundCaseId,
      metadata: {
        decisionType,
        approvedAmount: input.approvedAmount,
      },
    });

    void emitDisputeUpdated({
      refundCaseId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });

    const result = await this.getRefundCase(auth, refundCaseId);
    void sendRefundDecisionEmails(this.toRefundEmailCase(result));
    return result;
  }

  async addMessage(
    auth: AuthenticatedUser,
    refundCaseId: string,
    input: {
      message: string;
      attachmentUrl?: string;
    }
  ) {
    await this.requireAccessibleCase(auth, refundCaseId);

    const message = await this.caseMessageRepository.create({
      refundCaseId,
      senderUserId: auth.id,
      senderRole: auth.role,
      message: input.message,
      attachmentUrl: input.attachmentUrl,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "refund.message_added",
      entityType: "RefundCase",
      entityId: refundCaseId,
    });

    const serializedMessage = {
      id: message.id,
      refundCaseId,
      senderRole: message.senderRole,
      message: message.message,
      attachmentUrl: message.attachmentUrl,
      createdAt: message.createdAt.toISOString(),
      senderUser: {
        id: message.senderUser.id,
        fullName: message.senderUser.fullName,
        email: message.senderUser.email,
      },
    };

    void publishDisputeEvent({
      room: disputeRoomName(refundCaseId),
      event: "dispute:message",
      payload: serializedMessage,
    });

    return serializedMessage;
  }

  async listMessages(auth: AuthenticatedUser, refundCaseId: string) {
    await this.requireAccessibleCase(auth, refundCaseId);
    const messages = await this.caseMessageRepository.listByRefundCaseId(refundCaseId);

    return messages.map((message: (typeof messages)[number]) => ({
      id: message.id,
      senderRole: message.senderRole,
      message: message.message,
      attachmentUrl: message.attachmentUrl,
      createdAt: message.createdAt.toISOString(),
      senderUser: {
        id: message.senderUser.id,
        fullName: message.senderUser.fullName,
        email: message.senderUser.email,
      },
    }));
  }

  async escalateOverdue(auth: AuthenticatedUser) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can run SLA escalation",
        statusCode: 403,
      });
    }

    return this.runOverdueEscalation({
      actorUserId: auth.id,
      actorRole: auth.role,
    });
  }

  async runOverdueEscalation(input?: { actorUserId?: string; actorRole?: AuthenticatedUser["role"] }) {
    const overdueCases = await this.refundCaseRepository.listOverdue(new Date());
    const escalated = [];

    for (const refundCase of overdueCases) {
      const sellerType =
        refundCase.orderItem.orderVendor.vendorProfile?.sellerType ?? "THIRD_PARTY";

      // Outside vendors keep ownership of overdue refunds — do not auto-send to Mandawee.
      if (sellerType === "THIRD_PARTY") {
        continue;
      }

      const updated = await this.refundCaseRepository.update({
        id: refundCase.id,
        status: "ESCALATED_ADMIN",
        escalatedAt: new Date(),
        vendorResponseDueAt: null,
      });

      await this.auditLogRepository.create({
        actorUserId: input?.actorUserId,
        actorRole: input?.actorRole ?? "ADMIN",
        action: "refund.auto_escalated",
        entityType: "RefundCase",
        entityId: updated.id,
      });

      void emitDisputeUpdated({
        refundCaseId: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      });

      escalated.push({
        id: updated.id,
        status: updated.status,
        orderNumber: updated.order.orderNumber,
      });
    }

    if (escalated.length > 0) {
      void sendRefundOverdueEscalationSummaryEmail({
        count: escalated.length,
        orderNumbers: escalated.map((item) => item.orderNumber),
      });
    }

    return {
      count: escalated.length,
      cases: escalated.map(({ id, status }) => ({ id, status })),
    };
  }

  async adminFlagOrderForDispute(
    auth: AuthenticatedUser,
    orderId: string,
    input: { note: string }
  ) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can flag orders for dispute review",
        statusCode: 403,
      });
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    const cases = await this.refundCaseRepository.listByOrderId(orderId);
    const escalatedCaseIds: string[] = [];

    for (const refundCase of cases) {
      if (refundCase.status === "RESOLVED") continue;

      if (refundCase.status === "WAITING_VENDOR") {
        const updated = await this.refundCaseRepository.update({
          id: refundCase.id,
          status: "ESCALATED_ADMIN",
          escalatedAt: new Date(),
          vendorResponseDueAt: null,
        });

        escalatedCaseIds.push(updated.id);

        void emitDisputeUpdated({
          refundCaseId: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt,
        });
      }
    }

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "order.flagged_for_dispute",
      entityType: "Order",
      entityId: orderId,
      metadata: {
        note: input.note,
        escalatedCaseIds,
        openCaseCount: cases.filter((refundCase) => refundCase.status !== "RESOLVED")
          .length,
      },
    });

    return {
      orderId,
      orderNumber: order.orderNumber,
      flagged: true,
      note: input.note,
      escalatedCaseIds,
      openCaseCount: cases.filter((refundCase) => refundCase.status !== "RESOLVED")
        .length,
    };
  }

  async adminMarkOrderRefunded(
    auth: AuthenticatedUser,
    orderId: string,
    input: {
      reason: string;
      orderItemId?: string;
      approvedAmount?: number;
    }
  ) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can mark orders as refunded",
        statusCode: 403,
      });
    }

    const order = await this.orderRepository.findByIdForAdmin(orderId);
    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    if (
      order.paymentStatus !== "PAID" &&
      order.paymentStatus !== "PARTIALLY_REFUNDED"
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only paid orders can be marked as refunded",
        statusCode: 400,
      });
    }

    const allItems = order.vendorOrders.flatMap((vendorOrder) =>
      vendorOrder.items.map((item) => ({
        ...item,
        orderVendorId: vendorOrder.id,
      }))
    );

    const targetItems = input.orderItemId
      ? allItems.filter((item) => item.id === input.orderItemId)
      : allItems;

    if (targetItems.length === 0) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order item not found",
        statusCode: 404,
      });
    }

    const existingCases = await this.refundCaseRepository.listByOrderId(orderId);
    const processedCaseIds: string[] = [];

    for (const item of targetItems) {
      const itemCases = existingCases.filter(
        (refundCase) => refundCase.orderItemId === item.id
      );
      const approvedSoFar = itemCases.reduce((sum, refundCase) => {
        return sum + (refundCase.decision?.approvedAmount ?? 0);
      }, 0);
      const remaining = item.lineTotalAmount - approvedSoFar;

      if (remaining <= 0) continue;

      const amountToApprove =
        input.orderItemId && input.approvedAmount != null
          ? Math.min(input.approvedAmount, remaining)
          : remaining;

      if (amountToApprove <= 0) continue;

      const activeCase = itemCases.find(
        (refundCase) => refundCase.status !== "RESOLVED" && !refundCase.decision
      );

      if (activeCase) {
        const decisionType =
          amountToApprove >= activeCase.requestedAmount ? "APPROVE" : "PARTIAL";
        const decided = await this.adminDecision(auth, activeCase.id, {
          decisionType,
          approvedAmount: amountToApprove,
          reason: input.reason,
        });
        processedCaseIds.push(decided.id);
        continue;
      }

      const customerUserId = order.userId ?? auth.id;
      const refundCase = await this.refundCaseRepository.create({
        orderId: order.id,
        orderItemId: item.id,
        customerUserId,
        vendorProfileId: item.vendorProfileId,
        reason: "Admin dispute intervention",
        description: input.reason,
        requestedAmount: amountToApprove,
        status: "ESCALATED_ADMIN",
      });

      await this.refundCaseRepository.update({
        id: refundCase.id,
        escalatedAt: new Date(),
      });

      await this.refundEvidenceRepository.create({
        refundCaseId: refundCase.id,
        actorUserId: auth.id,
        actorRole: auth.role,
        note: `Admin marked refunded: ${input.reason}`,
      });

      const decided = await this.adminDecision(auth, refundCase.id, {
        decisionType: "APPROVE",
        approvedAmount: amountToApprove,
        reason: input.reason,
      });
      processedCaseIds.push(decided.id);
    }

    if (processedCaseIds.length === 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "No refundable amount remains on this order",
        statusCode: 400,
      });
    }

    const updatedOrder = await this.orderRepository.findById(orderId);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "order.admin_refunded",
      entityType: "Order",
      entityId: orderId,
      metadata: {
        reason: input.reason,
        orderItemId: input.orderItemId ?? null,
        approvedAmount: input.approvedAmount ?? null,
        refundCaseIds: processedCaseIds,
      },
    });

    return {
      orderId,
      orderNumber: order.orderNumber,
      paymentStatus: updatedOrder?.paymentStatus ?? order.paymentStatus,
      refundCaseIds: processedCaseIds,
    };
  }

  private async requireAccessibleCase(auth: AuthenticatedUser, refundCaseId: string) {
    const refundCase = await this.refundCaseRepository.findById(refundCaseId);

    if (!refundCase) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Refund case not found",
        statusCode: 404,
      });
    }

    const vendorUserId = refundCase.orderItem.orderVendor.vendorProfile.user.id;
    const isCustomer = refundCase.customerUserId === auth.id;
    const isVendor = vendorUserId === auth.id;
    const isAdmin = auth.role === "ADMIN";

    if (!isCustomer && !isVendor && !isAdmin) {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Access denied for refund case",
        statusCode: 403,
      });
    }

    return refundCase;
  }

  private async repairStuckRefundCaseIfNeeded(
    refundCase: NonNullable<Awaited<ReturnType<RefundCaseRepository["findById"]>>>
  ) {
    // Only repair the legacy stuck state: decision saved while status stayed ESCALATED_ADMIN.
    if (refundCase.status !== "ESCALATED_ADMIN" || !refundCase.decision) {
      return refundCase;
    }

    const updated = await this.refundCaseRepository.update({
      id: refundCase.id,
      status: "RESOLVED",
      finalDecisionAt: refundCase.finalDecisionAt ?? refundCase.decision.createdAt,
      vendorResponseDueAt: null,
    });

    const decisionType = refundCase.decision.decisionType;
    if (decisionType === "APPROVE" || decisionType === "PARTIAL") {
      await this.applyRefundFinancials(
        refundCase.id,
        updated.orderId,
        updated.orderItem.orderVendorId,
        updated.vendorProfileId,
        refundCase.decision.approvedAmount,
        updated.order.currency
      );
    }

    await this.syncOrderPaymentStatus(updated.orderId);

    void emitDisputeUpdated({
      refundCaseId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });

    return updated;
  }

  private async executeStripeRefund(input: {
    refundCase: NonNullable<Awaited<ReturnType<RefundCaseRepository["findById"]>>>;
    approvedAmount: number;
  }): Promise<StripeRefundMetadata> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError({
        code: ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: "Stripe is not configured for refunds",
        statusCode: 503,
      });
    }

    if (!input.refundCase.order.stripePaymentIntentId) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Order has no Stripe payment intent to refund",
        statusCode: 400,
      });
    }

    const idempotencyKey = `stripe_refund:${input.refundCase.id}:${input.approvedAmount}`;
    const requestHash = sha256(
      JSON.stringify({
        refundCaseId: input.refundCase.id,
        approvedAmount: input.approvedAmount,
        paymentIntentId: input.refundCase.order.stripePaymentIntentId,
      })
    );

    const existingKey = await this.idempotencyKeyRepository.findByKey(idempotencyKey);
    if (existingKey?.status === "SUCCEEDED" && existingKey.responseBody) {
      const response = existingKey.responseBody as Record<string, unknown>;
      return {
        id: String(response.id ?? ""),
        status: String(response.status ?? ""),
        failureCode: response.failureCode ? String(response.failureCode) : null,
        failureReason: response.failureReason ? String(response.failureReason) : null,
        attemptedAt: response.attemptedAt
          ? new Date(String(response.attemptedAt))
          : new Date(),
      };
    }

    if (!existingKey) {
      await this.idempotencyKeyRepository.createInProgress({
        key: idempotencyKey,
        scope: "stripe_refund",
        requestHash,
        expiresAt: durationFromNow("7d"),
      });
    }

    const { getStripeServerClient } = await import("@/lib/stripe/server");
    const stripe = getStripeServerClient();

    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: input.refundCase.order.stripePaymentIntentId,
          amount: input.approvedAmount,
          metadata: {
            refundCaseId: input.refundCase.id,
            orderId: input.refundCase.orderId,
          },
        },
        { idempotencyKey }
      );

      const metadata: StripeRefundMetadata = {
        id: refund.id,
        status: refund.status ?? "unknown",
        failureCode: refund.failure_reason ?? null,
        failureReason: refund.failure_reason ?? null,
        attemptedAt: new Date(),
      };

      if (refund.status !== "succeeded") {
        const failureBody = {
          id: metadata.id,
          status: metadata.status,
          failureCode: metadata.failureCode,
          failureReason: metadata.failureReason ?? "Stripe refund did not succeed",
          attemptedAt: metadata.attemptedAt.toISOString(),
        };
        await this.idempotencyKeyRepository.markFailed({
          key: idempotencyKey,
          responseCode: 502,
          responseBody: failureBody,
        });

        throw new AppError({
          code: ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: `Stripe refund failed with status ${metadata.status}`,
          statusCode: 502,
        });
      }

      await this.idempotencyKeyRepository.markSucceeded({
        key: idempotencyKey,
        responseCode: 200,
        responseBody: {
          id: metadata.id,
          status: metadata.status,
          failureCode: metadata.failureCode,
          failureReason: metadata.failureReason,
          attemptedAt: metadata.attemptedAt.toISOString(),
        },
        resourceType: "RefundCase",
        resourceId: input.refundCase.id,
      });

      return metadata;
    } catch (error) {
      const isAppError = error instanceof AppError;
      if (!isAppError) {
        await this.idempotencyKeyRepository.markFailed({
          key: idempotencyKey,
          responseCode: 502,
          responseBody: {
            error: "stripe_refund_failed",
            message: "Stripe refund request failed",
            attemptedAt: new Date().toISOString(),
          },
        });
      }
      throw error;
    }
  }

  private async applyRefundFinancials(
    refundCaseId: string,
    orderId: string,
    orderVendorId: string,
    vendorProfileId: string,
    approvedAmount: number,
    currency: string
  ) {
    const existingEntry =
      await this.vendorLedgerEntryRepository.findByRefundCaseId(refundCaseId);
    if (existingEntry) {
      return;
    }

    const payout = await this.payoutRepository.findByOrderVendorId(orderVendorId);
    const bucket = payout && payout.status === "ON_HOLD" ? "HOLD" : "AVAILABLE";
    const entryType =
      bucket === "HOLD" ? "REFUND_DEBIT_HOLD" : "REFUND_DEBIT_AVAILABLE";
    const payoutStatus = payout?.status ?? null;

    try {
      await prisma.$transaction(async (tx) => {
        const existingInTx = await tx.vendorLedgerEntry.findFirst({
          where: { refundCaseId },
        });
        if (existingInTx) {
          return;
        }

        const orderVendor = await tx.orderVendor.findUnique({
          where: { id: orderVendorId },
          select: {
            grandTotalAmount: true,
          },
        });
        const commission = await tx.commissionLedger.findUnique({
          where: { orderVendorId },
          select: {
            commissionAmount: true,
          },
        });

        const refundableGrossAmount = orderVendor?.grandTotalAmount ?? 0;
        const commissionAmount = commission?.commissionAmount ?? 0;
        const commissionRefundAmount =
          refundableGrossAmount > 0
            ? Math.min(
                approvedAmount,
                Math.max(
                  0,
                  Math.round((approvedAmount * commissionAmount) / refundableGrossAmount)
                )
              )
            : 0;
        const vendorDebitAmount = Math.max(
          0,
          Math.min(approvedAmount, approvedAmount - commissionRefundAmount)
        );
        const payoutAlreadySent = payoutStatus === "SENT";
        const payoutDescriptionSuffix = payoutAlreadySent
          ? " Payout is already SENT; this debit is recorded as vendor liability owed back to platform."
          : "";

        await tx.vendorLedgerEntry.create({
          data: {
            vendorProfileId,
            orderId,
            orderVendorId,
            refundCaseId,
            payoutId: payout?.id ?? null,
            bucket,
            entryType,
            amount: -vendorDebitAmount,
            currency,
            description:
              commissionRefundAmount > 0
                ? `Refund approved for order vendor ${orderVendorId}. Vendor debit excludes ${commissionRefundAmount} retained commission reversal.${payoutDescriptionSuffix}`
                : `Refund approved for order vendor ${orderVendorId}.${payoutDescriptionSuffix}`,
          },
        });

        const canAdjustPayoutAmount =
          payout && (payout.status === "ON_HOLD" || payout.status === "READY");
        if (canAdjustPayoutAmount) {
          await tx.payout.update({
            where: { id: payout.id },
            data: {
              amount: Math.max(0, payout.amount - vendorDebitAmount),
            },
          });
        } else if (payoutStatus === "SENT") {
          // Sent payouts are immutable; liability is represented by the ledger debit above.
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

  private async syncOrderPaymentStatus(orderId: string) {
    const refundCases = await this.refundCaseRepository.listByOrderId(orderId);
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    const approvedRefundTotal = refundCases.reduce((sum: number, refundCase: (typeof refundCases)[number]) => {
      return sum + (refundCase.decision?.approvedAmount ?? 0);
    }, 0);

    let fallbackStatus: PaymentStatus = "PAID";
    if (approvedRefundTotal >= order.grandTotalAmount) {
      fallbackStatus = "REFUNDED";
    } else if (approvedRefundTotal > 0) {
      fallbackStatus = "PARTIALLY_REFUNDED";
    }

    // Stripe is source of truth so cancel refunds are not overwritten by dispute sync.
    const paymentStatus = await resolvePaymentStatusFromStripe({
      stripePaymentIntentId: order.stripePaymentIntentId,
      fallbackStatus,
    });

    await this.orderRepository.updateOrderPaymentStatus(orderId, paymentStatus);
  }

  private assertActiveCustomer(auth: AuthenticatedUser) {
    if (auth.role !== "CUSTOMER" || auth.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active customers can request refunds",
        statusCode: 403,
      });
    }
  }

  private serializeRefundCase(
    refundCase: NonNullable<Awaited<ReturnType<RefundCaseRepository["findById"]>>>
  ) {
    return {
      id: refundCase.id,
      orderId: refundCase.orderId,
      orderItemId: refundCase.orderItemId,
      customerUserId: refundCase.customerUserId,
      vendorProfileId: refundCase.vendorProfileId,
      reason: refundCase.reason,
      description: refundCase.description,
      requestedAmount: refundCase.requestedAmount,
      status: refundCase.status,
      vendorExplanation: refundCase.vendorExplanation,
      vendorResponseDueAt: refundCase.vendorResponseDueAt?.toISOString() ?? null,
      escalatedAt: refundCase.escalatedAt?.toISOString() ?? null,
      finalDecisionAt: refundCase.finalDecisionAt?.toISOString() ?? null,
      createdAt: refundCase.createdAt.toISOString(),
      updatedAt: refundCase.updatedAt.toISOString(),
      order: {
        id: refundCase.order.id,
        orderNumber: refundCase.order.orderNumber,
        paymentStatus: refundCase.order.paymentStatus,
        currency: refundCase.order.currency,
      },
      orderItem: {
        id: refundCase.orderItem.id,
        productId: refundCase.orderItem.productId,
        productName: refundCase.orderItem.productName,
        productImage: refundCase.orderItem.productImage,
        quantity: refundCase.orderItem.quantity,
        lineTotalAmount: refundCase.orderItem.lineTotalAmount,
      },
      customer: {
        id: refundCase.customerUser.id,
        fullName: refundCase.customerUser.fullName,
        email: refundCase.customerUser.email,
        phone: refundCase.customerUser.phone,
      },
      vendor: {
        vendorProfileId: refundCase.orderItem.orderVendor.vendorProfile.id,
        storeName: refundCase.orderItem.orderVendor.vendorProfile.storeName,
        storeSlug: refundCase.orderItem.orderVendor.vendorProfile.storeSlug,
        sellerType:
          refundCase.orderItem.orderVendor.vendorProfile.sellerType ?? "THIRD_PARTY",
        user: {
          id: refundCase.orderItem.orderVendor.vendorProfile.user.id,
          fullName: refundCase.orderItem.orderVendor.vendorProfile.user.fullName,
          email: refundCase.orderItem.orderVendor.vendorProfile.user.email,
          phone: refundCase.orderItem.orderVendor.vendorProfile.user.phone,
        },
      },
      decision: refundCase.decision
        ? {
            decisionType: refundCase.decision.decisionType,
            approvedAmount: refundCase.decision.approvedAmount,
            reason: refundCase.decision.reason,
            stripeRefundId: refundCase.decision.stripeRefundId,
            stripeRefundStatus: refundCase.decision.stripeRefundStatus,
            stripeRefundFailureCode: refundCase.decision.stripeRefundFailureCode,
            stripeRefundFailureReason: refundCase.decision.stripeRefundFailureReason,
            stripeRefundAttemptedAt:
              refundCase.decision.stripeRefundAttemptedAt?.toISOString() ?? null,
            createdAt: refundCase.decision.createdAt.toISOString(),
          }
        : null,
      evidences: refundCase.evidences.map((evidence: (typeof refundCase.evidences)[number]) => ({
        id: evidence.id,
        actorRole: evidence.actorRole,
        fileUrl: evidence.fileUrl,
        note: evidence.note,
        createdAt: evidence.createdAt.toISOString(),
      })),
    };
  }

  private serializeRefundCaseListItem(
    refundCase: Awaited<ReturnType<RefundCaseRepository["listWithFilters"]>>[number]
  ) {
    return {
      id: refundCase.id,
      orderId: refundCase.orderId,
      orderItemId: refundCase.orderItemId,
      reason: refundCase.reason,
      requestedAmount: refundCase.requestedAmount,
      status: refundCase.status,
      vendorResponseDueAt: refundCase.vendorResponseDueAt?.toISOString() ?? null,
      escalatedAt: refundCase.escalatedAt?.toISOString() ?? null,
      finalDecisionAt: refundCase.finalDecisionAt?.toISOString() ?? null,
      createdAt: refundCase.createdAt.toISOString(),
      updatedAt: refundCase.updatedAt.toISOString(),
      order: {
        id: refundCase.order.id,
        orderNumber: refundCase.order.orderNumber,
        paymentStatus: refundCase.order.paymentStatus,
        currency: refundCase.order.currency,
      },
      orderItem: {
        id: refundCase.orderItem.id,
        productName: refundCase.orderItem.productName,
        productImage: refundCase.orderItem.productImage,
        quantity: refundCase.orderItem.quantity,
        lineTotalAmount: refundCase.orderItem.lineTotalAmount,
      },
      customer: {
        id: refundCase.customerUser.id,
        fullName: refundCase.customerUser.fullName,
        email: refundCase.customerUser.email,
      },
      vendor: {
        vendorProfileId: refundCase.orderItem.orderVendor.vendorProfile.id,
        storeName: refundCase.orderItem.orderVendor.vendorProfile.storeName,
        storeSlug: refundCase.orderItem.orderVendor.vendorProfile.storeSlug,
        sellerType:
          refundCase.orderItem.orderVendor.vendorProfile.sellerType ?? "THIRD_PARTY",
      },
      decision: refundCase.decision
        ? {
            decisionType: refundCase.decision.decisionType,
            approvedAmount: refundCase.decision.approvedAmount,
            stripeRefundStatus: refundCase.decision.stripeRefundStatus,
            createdAt: refundCase.decision.createdAt.toISOString(),
          }
        : null,
    };
  }

  private toRefundEmailCase(refundCase: ReturnType<RefundService["serializeRefundCase"]>) {
    return {
      id: refundCase.id,
      reason: refundCase.reason,
      requestedAmount: refundCase.requestedAmount,
      status: refundCase.status,
      order: {
        orderNumber: refundCase.order.orderNumber,
        currency: refundCase.order.currency,
      },
      orderItem: {
        productName: refundCase.orderItem.productName,
      },
      customer: refundCase.customer,
      vendor: {
        storeName: refundCase.vendor.storeName,
        user: refundCase.vendor.user,
      },
      decision: refundCase.decision,
    };
  }

  private async notifyRefundOpened(
    refundCase: ReturnType<RefundService["serializeRefundCase"]>
  ) {
    const emailCase = this.toRefundEmailCase(refundCase);
    if (refundCase.vendor.sellerType === "PLATFORM") {
      await Promise.allSettled([
        sendRefundOpenedCustomerEmail(emailCase),
        sendRefundEscalatedAdminEmail(emailCase),
      ]);
      return;
    }

    await Promise.allSettled([
      sendRefundOpenedCustomerEmail(emailCase),
      sendRefundOpenedVendorEmail(emailCase),
    ]);
  }
}
