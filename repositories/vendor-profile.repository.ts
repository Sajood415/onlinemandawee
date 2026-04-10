import { prisma } from "@/lib/db/prisma";

import type { BusinessType } from "@/domain/vendor/vendor-types";
import type {
  VendorOnboardingStep,
} from "@/domain/vendor/vendor-onboarding-step";
import type { VendorStatus } from "@/domain/vendor/vendor-status";

export class VendorProfileRepository {
  create(input: { userId: string }) {
    return prisma.vendorProfile.create({
      data: {
        userId: input.userId,
      },
    });
  }

  findById(id: string) {
    return prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        user: true,
        kycDocuments: true,
        address: true,
        payoutMethod: true,
        agreementAcceptance: true,
      },
    });
  }

  findByUserId(userId: string) {
    return prisma.vendorProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        kycDocuments: true,
        address: true,
        payoutMethod: true,
        agreementAcceptance: true,
      },
    });
  }

  findByStoreSlug(storeSlug: string) {
    return prisma.vendorProfile.findUnique({
      where: { storeSlug },
    });
  }

  updateStoreInformation(input: {
    vendorProfileId: string;
    storeName: string;
    storeSlug: string;
    businessType: BusinessType;
    logoUrl?: string;
    description?: string;
    onboardingStep: VendorOnboardingStep;
    status?: VendorStatus;
    rejectionReason?: null;
    rejectedAt?: null;
  }) {
    return prisma.vendorProfile.update({
      where: { id: input.vendorProfileId },
      data: {
        storeName: input.storeName,
        storeSlug: input.storeSlug,
        businessType: input.businessType,
        logoUrl: input.logoUrl ?? null,
        description: input.description ?? null,
        onboardingStep: input.onboardingStep,
        status: input.status,
        rejectionReason: input.rejectionReason,
        rejectedAt: input.rejectedAt,
      },
    });
  }

  updateStep(input: {
    vendorProfileId: string;
    onboardingStep: VendorOnboardingStep;
    status?: VendorStatus;
    submittedAt?: Date | null;
    approvedAt?: Date | null;
    approvedByUserId?: string | null;
    rejectedAt?: Date | null;
    rejectionReason?: string | null;
    suspendedAt?: Date | null;
    suspensionReason?: string | null;
  }) {
    return prisma.vendorProfile.update({
      where: { id: input.vendorProfileId },
      data: {
        onboardingStep: input.onboardingStep,
        status: input.status,
        submittedAt: input.submittedAt,
        approvedAt: input.approvedAt,
        approvedByUserId: input.approvedByUserId,
        rejectedAt: input.rejectedAt,
        rejectionReason: input.rejectionReason,
        suspendedAt: input.suspendedAt,
        suspensionReason: input.suspensionReason,
      },
    });
  }

  listByStatus(status?: VendorStatus) {
    return prisma.vendorProfile.findMany({
      where: status ? { status } : undefined,
      include: {
        user: true,
        kycDocuments: true,
        address: true,
        payoutMethod: true,
        agreementAcceptance: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
