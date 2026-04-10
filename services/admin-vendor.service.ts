import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { UserRepository } from "@/repositories/user.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { VendorStatus } from "@/domain/vendor/vendor-status";

export class AdminVendorService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
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

    return {
      id: vendor.id,
      status: vendor.status,
      onboardingStep: vendor.onboardingStep,
      storeName: vendor.storeName,
      storeSlug: vendor.storeSlug,
      businessType: vendor.businessType,
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
    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.vendor_approved",
      entityType: "VendorProfile",
      entityId: vendorProfileId,
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

    return {
      id: updated.id,
      status: updated.status,
      suspendedAt: updated.suspendedAt?.toISOString() ?? null,
      suspensionReason: updated.suspensionReason,
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
