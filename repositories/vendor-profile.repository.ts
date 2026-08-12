import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import type { BusinessType } from "@/domain/vendor/vendor-types";
import type {
  VendorOnboardingStep,
} from "@/domain/vendor/vendor-onboarding-step";
import type { VendorStatus } from "@/domain/vendor/vendor-status";
import type { SellerType } from "@/domain/vendor/vendor-types";

export class VendorProfileRepository {
  create(input: { userId: string }) {
    // MongoDB unique indexes treat null as a real value, so every profile needs
    // a unique storeSlug from creation. We use a draft prefix that gets replaced
    // with the real slug when the vendor completes step 2 (store information).
    return prisma.vendorProfile.create({
      data: {
        userId: input.userId,
        storeSlug: `_draft_${input.userId}`,
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
    return prisma.vendorProfile.findFirst({
      where: { storeSlug },
    });
  }

  updateStoreInformation(input: {
    vendorProfileId: string;
    storeName: string;
    storeSlug: string;
    businessType: BusinessType;
    industryType?: string;
    logoUrl?: string;
    description?: string;
    onboardingStep: VendorOnboardingStep;
    status?: VendorStatus;
    rejectionReason?: null;
    rejectedAt?: null;
    /** Clear license when switching to individual. */
    businessLicenseUrl?: string | null;
  }) {
    return prisma.vendorProfile.update({
      where: { id: input.vendorProfileId },
      data: {
        storeName: input.storeName,
        storeSlug: input.storeSlug,
        businessType: input.businessType,
        industryType: input.industryType ?? null,
        logoUrl: input.logoUrl ?? null,
        description: input.description ?? null,
        onboardingStep: input.onboardingStep,
        status: input.status,
        rejectionReason: input.rejectionReason,
        rejectedAt: input.rejectedAt,
        ...(input.businessLicenseUrl !== undefined
          ? { businessLicenseUrl: input.businessLicenseUrl }
          : {}),
      },
    });
  }

  updateBusinessLicenseUrl(vendorProfileId: string, businessLicenseUrl: string | null) {
    return prisma.vendorProfile.update({
      where: { id: vendorProfileId },
      data: { businessLicenseUrl },
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
    subscriptionStatus?: "TRIAL" | "ACTIVE" | "FAILED" | "SUSPENDED";
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeDefaultPaymentMethodId?: string | null;
    subscriptionTrialEndsAt?: Date | null;
    subscriptionCurrentPeriodStart?: Date | null;
    subscriptionCurrentPeriodEnd?: Date | null;
    subscriptionLastPaymentAt?: Date | null;
    subscriptionNextBillingAt?: Date | null;
    subscriptionGracePeriodEndsAt?: Date | null;
    subscriptionFailedPaymentCount?: number;
    subscriptionFailedAt?: Date | null;
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
        subscriptionStatus: input.subscriptionStatus,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        stripeDefaultPaymentMethodId: input.stripeDefaultPaymentMethodId,
        subscriptionTrialEndsAt: input.subscriptionTrialEndsAt,
        subscriptionCurrentPeriodStart: input.subscriptionCurrentPeriodStart,
        subscriptionCurrentPeriodEnd: input.subscriptionCurrentPeriodEnd,
        subscriptionLastPaymentAt: input.subscriptionLastPaymentAt,
        subscriptionNextBillingAt: input.subscriptionNextBillingAt,
        subscriptionGracePeriodEndsAt: input.subscriptionGracePeriodEndsAt,
        subscriptionFailedPaymentCount: input.subscriptionFailedPaymentCount,
        subscriptionFailedAt: input.subscriptionFailedAt,
      },
    });
  }

  updateSellerType(input: { vendorProfileId: string; sellerType: SellerType }) {
    return prisma.vendorProfile.update({
      where: { id: input.vendorProfileId },
      data: {
        sellerType: input.sellerType,
      },
      include: {
        user: true,
        kycDocuments: true,
        address: true,
        payoutMethod: true,
        agreementAcceptance: true,
      },
    });
  }

  findByStripeCustomerId(stripeCustomerId: string) {
    return prisma.vendorProfile.findFirst({
      where: { stripeCustomerId },
      include: {
        user: true,
        kycDocuments: true,
        address: true,
        payoutMethod: true,
        agreementAcceptance: true,
      },
    });
  }

  findByStripeSubscriptionId(stripeSubscriptionId: string) {
    return prisma.vendorProfile.findFirst({
      where: { stripeSubscriptionId },
      include: {
        user: true,
        kycDocuments: true,
        address: true,
        payoutMethod: true,
        agreementAcceptance: true,
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

  listPublic(filters?: {
    industryType?: string;
    industryTypes?: string[];
    search?: string;
    country?: string;
    city?: string;
  }) {
    const and: Prisma.VendorProfileWhereInput[] = [
      { status: "ACTIVE" },
      { storeName: { not: null } },
      { storeSlug: { not: null } },
      {
        NOT: {
          storeSlug: {
            startsWith: "_draft_",
          },
        },
      },
    ];

    if (filters?.industryType) {
      and.push({ industryType: filters.industryType });
    } else if (filters?.industryTypes?.length) {
      and.push({ industryType: { in: filters.industryTypes } });
    }

    if (filters?.country?.trim()) {
      and.push({
        address: {
          is: {
            country: { contains: filters.country.trim(), mode: "insensitive" },
          },
        },
      });
    }

    if (filters?.city?.trim()) {
      and.push({
        address: {
          is: {
            city: { contains: filters.city.trim(), mode: "insensitive" },
          },
        },
      });
    }

    if (filters?.search?.trim()) {
      const search = filters.search.trim();
      and.push({
        OR: [
          { storeName: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { industryType: { contains: search, mode: "insensitive" } },
          {
            address: {
              is: { city: { contains: search, mode: "insensitive" } },
            },
          },
          {
            address: {
              is: { country: { contains: search, mode: "insensitive" } },
            },
          },
        ],
      });
    }

    return prisma.vendorProfile.findMany({
      where: { AND: and },
      select: {
        id: true,
        storeName: true,
        storeSlug: true,
        logoUrl: true,
        description: true,
        industryType: true,
        approvedAt: true,
        address: {
          select: {
            city: true,
            country: true,
          },
        },
        _count: {
          select: {
            products: {
              where: {
                approvalStatus: "APPROVED",
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        storeName: "asc",
      },
    });
  }

  listForMembershipBilling() {
    return prisma.vendorProfile.findMany({
      where: {
        sellerType: "THIRD_PARTY",
        OR: [
          { status: "ACTIVE" },
          {
            status: "SUSPENDED",
            suspensionReason: {
              startsWith: "Shop suspended: unpaid marketplace subscription",
            },
          },
        ],
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
