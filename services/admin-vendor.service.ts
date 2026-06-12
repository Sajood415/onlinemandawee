import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import { buildVendorReviewStatusEmailHtml } from "@/lib/mail/vendor-review-status-email-html";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import { MembershipInvoiceRepository } from "@/repositories/membership-invoice.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { UserRepository } from "@/repositories/user.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import {
  restoreVendorBillingAccessAfterManualResolution,
  syncVendorBillingAccess,
} from "@/lib/membership/billing-access";
import { isMembershipBillingSuspension } from "@/lib/membership/subscription-policy";
import { MembershipBillingService } from "@/services/membership-billing.service";
import { VendorSubscriptionService } from "@/services/vendor-subscription.service";
import { env } from "@/config/env";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { VendorStatus } from "@/domain/vendor/vendor-status";

export class AdminVendorService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly auditLogRepository = new AuditLogRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly productRepository = new ProductRepository(),
    private readonly membershipInvoiceRepository = new MembershipInvoiceRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly vendorSubscriptionService = new VendorSubscriptionService(),
    private readonly membershipBillingService = new MembershipBillingService()
  ) {}

  async list(status?: VendorStatus) {
    const vendors = await this.vendorProfileRepository.listByStatus(status);

    return vendors.map((vendor) => ({
      id: vendor.id,
      status: vendor.status,
      onboardingStep: vendor.onboardingStep,
      storeName: vendor.storeName,
      storeSlug: vendor.storeSlug,
      businessType: vendor.businessType,
      submittedAt: vendor.submittedAt?.toISOString() ?? null,
      approvedAt: vendor.approvedAt?.toISOString() ?? null,
      rejectedAt: vendor.rejectedAt?.toISOString() ?? null,
      user: {
        id: vendor.user.id,
        fullName: vendor.user.fullName,
        email: vendor.user.email,
        phone: vendor.user.phone,
        status: vendor.user.status,
      },
    }));
  }

  async detail(vendorProfileId: string) {
    const vendor = await this.requireVendor(vendorProfileId);

    const [products, vendorOrders, membershipInvoices, commissionEntries] =
      await Promise.all([
        this.productRepository.listByVendor(vendorProfileId),
        this.orderRepository.listByVendorProfileId(vendorProfileId),
        this.membershipInvoiceRepository.listByVendorProfileId(vendorProfileId),
        this.commissionLedgerRepository.listByVendorProfileId(vendorProfileId),
      ]);

    const pendingInvoices = membershipInvoices.filter(
      (invoice) => invoice.status === "PENDING"
    );
    const outstandingMembershipAmount = pendingInvoices.reduce(
      (sum, invoice) => sum + invoice.amount,
      0
    );
    const feesCurrency =
      pendingInvoices[0]?.currency ??
      membershipInvoices[0]?.currency ??
      commissionEntries[0]?.currency ??
      "USD";
    const totalPlatformCommissionCollected = commissionEntries.reduce(
      (sum, entry) => sum + entry.commissionAmount,
      0
    );

    return {
      id: vendor.id,
      status: vendor.status,
      onboardingStep: vendor.onboardingStep,
      storeName: vendor.storeName,
      storeSlug: vendor.storeSlug,
      businessType: vendor.businessType,
      industryType: vendor.industryType ?? null,
      logoUrl: vendor.logoUrl,
      description: vendor.description,
      submittedAt: vendor.submittedAt?.toISOString() ?? null,
      approvedAt: vendor.approvedAt?.toISOString() ?? null,
      rejectedAt: vendor.rejectedAt?.toISOString() ?? null,
      rejectionReason: vendor.rejectionReason,
      suspendedAt: vendor.suspendedAt?.toISOString() ?? null,
      suspensionReason: vendor.suspensionReason,
      user: {
        id: vendor.user.id,
        fullName: vendor.user.fullName,
        email: vendor.user.email,
        phone: vendor.user.phone,
        status: vendor.user.status,
      },
      kycDocuments: vendor.kycDocuments.map((document) => ({
        id: document.id,
        documentType: document.documentType,
        documentUrl: document.documentUrl,
        selfieWithIdUrl: document.selfieWithIdUrl,
        reviewStatus: document.reviewStatus,
        rejectionReason: document.rejectionReason,
      })),
      address: vendor.address,
      payoutMethod: vendor.payoutMethod,
      agreementAcceptance: vendor.agreementAcceptance,
      outstandingFees: {
        currency: feesCurrency,
        pendingMembershipAmount: outstandingMembershipAmount,
        pendingMembershipCount: pendingInvoices.length,
        totalPlatformCommissionCollected,
      },
      subscription: {
        status: vendor.subscriptionStatus,
        trialEndsAt: vendor.subscriptionTrialEndsAt?.toISOString() ?? null,
        currentPeriodStart:
          vendor.subscriptionCurrentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: vendor.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
        gracePeriodEndsAt:
          vendor.subscriptionGracePeriodEndsAt?.toISOString() ?? null,
        failedPaymentCount: vendor.subscriptionFailedPaymentCount,
        stripeCustomerId: vendor.stripeCustomerId ?? null,
        stripeSubscriptionId: vendor.stripeSubscriptionId ?? null,
        stripeDefaultPaymentMethodId: vendor.stripeDefaultPaymentMethodId ?? null,
        lastPaymentAt: vendor.subscriptionLastPaymentAt?.toISOString() ?? null,
        nextBillingAt: vendor.subscriptionNextBillingAt?.toISOString() ?? null,
      },
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        priceAmount: product.priceAmount,
        currency: product.currency,
        stockQty: product.stockQty,
        approvalStatus: product.approvalStatus,
        isActive: product.isActive,
        categoryName: product.category.name,
        createdAt: product.createdAt.toISOString(),
      })),
      orders: vendorOrders.map((vendorOrder) => ({
        id: vendorOrder.id,
        status: vendorOrder.status,
        orderNumber: vendorOrder.order.orderNumber,
        paymentStatus: vendorOrder.order.paymentStatus,
        grandTotalAmount: vendorOrder.grandTotalAmount,
        currency: vendorOrder.currency,
        itemCount: vendorOrder.items.length,
        createdAt: vendorOrder.createdAt.toISOString(),
      })),
      subscriptionHistory: membershipInvoices.map((invoice) => ({
        id: invoice.id,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        stripeCustomerId: invoice.stripeCustomerId,
        stripeSubscriptionId: invoice.stripeSubscriptionId,
        stripeInvoiceId: invoice.stripeInvoiceId,
        stripePaymentId: invoice.stripePaymentId,
        stripeEventId: invoice.stripeEventId,
        failureCode: invoice.failureCode,
        failureReason: invoice.failureReason,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        dueAt: invoice.dueAt.toISOString(),
        paidAt: invoice.paidAt?.toISOString() ?? null,
        attemptedAt: invoice.attemptedAt?.toISOString() ?? null,
        invoiceHostedUrl: invoice.invoiceHostedUrl,
        waivedReason: invoice.waivedReason,
      })),
    };
  }

  async approve(vendorProfileId: string, admin: AuthenticatedUser) {
    const vendor = await this.requireVendor(vendorProfileId);

    if (vendor.status !== "PENDING_APPROVAL") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only pending vendors can be approved",
        statusCode: 400,
      });
    }

    const updated = await this.vendorProfileRepository.updateStep({
      vendorProfileId,
      onboardingStep: "SUBMITTED",
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedByUserId: admin.id,
      rejectedAt: null,
      rejectionReason: null,
      suspendedAt: null,
      suspensionReason: null,
    });

    await this.userRepository.updateStatus(vendor.userId, "ACTIVE");
    await this.vendorSubscriptionService.ensureSubscriptionForVendor(vendorProfileId);
    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.vendor_approved",
      entityType: "VendorProfile",
      entityId: vendorProfileId,
    });
    await sendTransactionalEmail({
      to: vendor.user.email,
      subject: `${env.APP_NAME} — vendor application approved`,
      text: `Hi ${vendor.user.fullName},\n\nYour vendor application has been approved. You can now sign in and start managing your vendor account.\n\n${env.APP_NAME} Team`,
      html: buildVendorReviewStatusEmailHtml({
        appName: env.APP_NAME,
        heading: "Your application is approved",
        message:
          "Your vendor application has been approved. You can now sign in and start managing your vendor account.",
      }),
    });

    return {
      id: updated.id,
      status: updated.status,
      approvedAt: updated.approvedAt?.toISOString() ?? null,
    };
  }

  async reject(vendorProfileId: string, admin: AuthenticatedUser, reason?: string) {
    const vendor = await this.requireVendor(vendorProfileId);

    if (vendor.status !== "PENDING_APPROVAL") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only pending vendors can be rejected",
        statusCode: 400,
      });
    }

    const updated = await this.vendorProfileRepository.updateStep({
      vendorProfileId,
      onboardingStep: "AGREEMENTS",
      status: "REJECTED",
      approvedAt: null,
      approvedByUserId: null,
      rejectedAt: new Date(),
      rejectionReason: reason ?? "Vendor application was rejected",
      suspendedAt: null,
      suspensionReason: null,
    });

    await this.userRepository.updateStatus(vendor.userId, "PENDING");
    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.vendor_rejected",
      entityType: "VendorProfile",
      entityId: vendorProfileId,
      metadata: {
        reason: reason ?? null,
      },
    });
    await sendTransactionalEmail({
      to: vendor.user.email,
      subject: `${env.APP_NAME} — vendor application needs updates`,
      text: `Hi ${vendor.user.fullName},\n\nYour vendor application was not approved this time.${
        reason ? `\nReason: ${reason}` : ""
      }\n\nPlease update your details and submit again.\n\n${env.APP_NAME} Team`,
      html: buildVendorReviewStatusEmailHtml({
        appName: env.APP_NAME,
        heading: "Your application needs updates",
        message:
          "Your vendor application was not approved this time. Please update your details and submit again.",
        ...(reason ? { note: `Reason: ${reason}` } : {}),
      }),
    });

    return {
      id: updated.id,
      status: updated.status,
      rejectedAt: updated.rejectedAt?.toISOString() ?? null,
      rejectionReason: updated.rejectionReason,
    };
  }

  async suspend(vendorProfileId: string, admin: AuthenticatedUser, reason?: string) {
    const vendor = await this.requireVendor(vendorProfileId);

    if (vendor.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only active vendors can be suspended",
        statusCode: 400,
      });
    }

    const updated = await this.vendorProfileRepository.updateStep({
      vendorProfileId,
      onboardingStep: vendor.onboardingStep,
      status: "SUSPENDED",
      suspendedAt: new Date(),
      suspensionReason: reason ?? "Vendor account was suspended",
    });

    await this.userRepository.updateStatus(vendor.userId, "BLOCKED");
    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.vendor_suspended",
      entityType: "VendorProfile",
      entityId: vendorProfileId,
      metadata: {
        reason: reason ?? null,
      },
    });

    const suspensionMessage = reason ?? "Vendor account was suspended";
    await sendTransactionalEmail({
      to: vendor.user.email,
      subject: `${env.APP_NAME} — vendor account suspended`,
      text: `Hi ${vendor.user.fullName},\n\nYour vendor account has been suspended.\nReason: ${suspensionMessage}\n\nYour store is hidden from customers until further notice.\n\n${env.APP_NAME} Team`,
      html: buildVendorReviewStatusEmailHtml({
        appName: env.APP_NAME,
        heading: "Your vendor account is suspended",
        message:
          "Your vendor account has been suspended and your store is hidden from customers until further notice.",
        note: `Reason: ${suspensionMessage}`,
      }),
    });

    return {
      id: updated.id,
      status: updated.status,
      suspendedAt: updated.suspendedAt?.toISOString() ?? null,
      suspensionReason: updated.suspensionReason,
    };
  }

  async reactivate(vendorProfileId: string, admin: AuthenticatedUser) {
    const vendor = await this.requireVendor(vendorProfileId);

    if (vendor.status !== "SUSPENDED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only suspended vendors can be reactivated",
        statusCode: 400,
      });
    }

    if (isMembershipBillingSuspension(vendor.suspensionReason)) {
      const canReactivate =
        await this.membershipBillingService.canReactivateFromBilling(vendorProfileId);
      if (!canReactivate) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message:
            "Resolve unpaid membership billing before reactivating this vendor. Mark pending invoices paid, waive the month, or wait for Stripe payment success.",
          statusCode: 400,
        });
      }
    }

    let updated;
    if (isMembershipBillingSuspension(vendor.suspensionReason)) {
      await restoreVendorBillingAccessAfterManualResolution(vendorProfileId);
      await syncVendorBillingAccess(vendorProfileId);
      updated = await this.vendorProfileRepository.findById(vendorProfileId);
    } else {
      updated = await this.vendorProfileRepository.updateStep({
        vendorProfileId,
        onboardingStep: vendor.onboardingStep,
        status: "ACTIVE",
        suspendedAt: null,
        suspensionReason: null,
      });
      await this.userRepository.updateStatus(vendor.userId, "ACTIVE");
    }

    if (!updated) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    await this.vendorSubscriptionService.ensureSubscriptionForVendor(vendorProfileId);
    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.vendor_reactivated",
      entityType: "VendorProfile",
      entityId: vendorProfileId,
    });
    await sendTransactionalEmail({
      to: vendor.user.email,
      subject: `${env.APP_NAME} — vendor account reactivated`,
      text: `Hi ${vendor.user.fullName},\n\nYour vendor account has been reactivated. You can sign in and your store is visible to customers again.\n\n${env.APP_NAME} Team`,
      html: buildVendorReviewStatusEmailHtml({
        appName: env.APP_NAME,
        heading: "Your vendor account is active again",
        message:
          "Your vendor account has been reactivated. You can sign in and your store is visible to customers again.",
      }),
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  private async requireVendor(vendorProfileId: string) {
    const vendor = await this.vendorProfileRepository.findById(vendorProfileId);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    return vendor;
  }
}
