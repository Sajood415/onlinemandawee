import { Prisma } from "@prisma/client";

import { env } from "@/config/env";
import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { disputeRoomName } from "@/domain/realtime/dispute-events";
import type { PaymentStatus } from "@/domain/order/order-status";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { prisma } from "@/lib/db/prisma";
import { getRefundEligibility } from "@/lib/refunds/refund-eligibility";
import {
  sendRefundDecisionEmails,
  sendRefundEscalatedAdminEmail,
  sendRefundOpenedCustomerEmail,
  sendRefundOpenedVendorEmail,
  sendRefundOverdueEscalationSummaryEmail,
} from "@/lib/mail/send-refund-emails";
import { emitDisputeUpdated } from "@/lib/realtime/emit-dispute-updated";
import { publishDisputeEvent } from "@/lib/realtime/publish-dispute-event";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CaseMessageRepository } from "@/repositories/case-message.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import {
  RefundCaseRepository,
  type RefundCaseListFilters,
} from "@/repositories/refund-case.repository";
import { RefundDecisionRepository } from "@/repositories/refund-decision.repository";
import { RefundEvidenceRepository } from "@/repositories/refund-evidence.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class RefundService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly refundCaseRepository = new RefundCaseRepository(),
    private readonly refundEvidenceRepository = new RefundEvidenceRepository(),
    private readonly refundDecisionRepository = new RefundDecisionRepository(),
    private readonly caseMessageRepository = new CaseMessageRepository(),
    private readonly payoutRepository = new PayoutRepository(),
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
      orderItem.orderVendor.order.paymentStatus !== "PAID" &&
      orderItem.orderVendor.order.paymentStatus !== "PARTIALLY_REFUNDED"
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
      windowDays: env.REFUND_WINDOW_DAYS,
    });

    if (refundEligibility === "not_yet_delivered") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: `Refunds are only allowed within ${env.REFUND_WINDOW_DAYS} days after an order is marked delivered`,
        statusCode: 400,
      });
    }

    if (refundEligibility === "expired") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refund period has expired.",
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

    const refundCase = await this.refundCaseRepository.create({
      orderId: orderItem.orderVendor.orderId,
      orderItemId: orderItem.id,
      customerUserId: auth.id,
      vendorProfileId: orderItem.vendorProfileId,
      reason: input.reason,
      description: input.description,
      requestedAmount: input.requestedAmount,
      status: "WAITING_VENDOR",
      vendorResponseDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
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
      await this.refundDecisionRepository.create({
        refundCaseId,
        decisionType: "APPROVE",
        approvedAmount: refundCase.requestedAmount,
        reason: input.explanation,
        decidedByUserId: auth.id,
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

    const updated = await this.refundCaseRepository.update({
      id: refundCaseId,
      status: "ESCALATED_ADMIN",
      vendorExplanation: `${input.action}: ${input.explanation}`,
      escalatedAt: new Date(),
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
    void sendRefundEscalatedAdminEmail(this.toRefundEmailCase(serialized));
    return serialized;
  }

  async escalate(auth: AuthenticatedUser, refundCaseId: string) {
    const refundCase = await this.requireAccessibleCase(auth, refundCaseId);

    if (refundCase.status === "RESOLVED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Resolved refund case cannot be escalated",
        statusCode: 400,
      });
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

    if (refundCase.status === "RESOLVED" || refundCase.decision) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Refund case is already resolved",
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

    await this.refundDecisionRepository.create({
      refundCaseId,
      decisionType: input.decisionType,
      approvedAmount: input.approvedAmount,
      reason: input.reason,
      decidedByUserId: auth.id,
    });

    const updated = await this.refundCaseRepository.update({
      id: refundCaseId,
      status: "RESOLVED",
      finalDecisionAt: new Date(),
      vendorResponseDueAt: null,
    });

    if (input.decisionType === "APPROVE" || input.decisionType === "PARTIAL") {
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
        decisionType: input.decisionType,
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
    const bucket =
      payout && payout.status === "ON_HOLD" ? "HOLD" : "AVAILABLE";
    const entryType =
      bucket === "HOLD" ? "REFUND_DEBIT_HOLD" : "REFUND_DEBIT_AVAILABLE";

    try {
      await prisma.$transaction(async (tx) => {
        const existingInTx = await tx.vendorLedgerEntry.findUnique({
          where: { refundCaseId },
        });
        if (existingInTx) {
          return;
        }

        await tx.vendorLedgerEntry.create({
          data: {
            vendorProfileId,
            orderId,
            orderVendorId,
            refundCaseId,
            payoutId: payout?.id ?? null,
            bucket,
            entryType,
            amount: -approvedAmount,
            currency,
            description: `Refund approved for order vendor ${orderVendorId}`,
          },
        });

        if (payout && (payout.status === "ON_HOLD" || payout.status === "READY")) {
          await tx.payout.update({
            where: { id: payout.id },
            data: {
              amount: Math.max(0, payout.amount - approvedAmount),
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

    let paymentStatus: PaymentStatus = "PAID";

    if (approvedRefundTotal >= order.grandTotalAmount) {
      paymentStatus = "REFUNDED";
    } else if (approvedRefundTotal > 0) {
      paymentStatus = "PARTIALLY_REFUNDED";
    }

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
      },
      decision: refundCase.decision
        ? {
            decisionType: refundCase.decision.decisionType,
            approvedAmount: refundCase.decision.approvedAmount,
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
    await Promise.allSettled([
      sendRefundOpenedCustomerEmail(emailCase),
      sendRefundOpenedVendorEmail(emailCase),
    ]);
  }
}
