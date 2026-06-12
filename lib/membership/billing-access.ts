import { env } from "@/config/env";
import { prisma } from "@/lib/db/prisma";
import {
  isMembershipBillingSuspension,
  MEMBERSHIP_BILLING_SUSPENSION_REASON,
} from "@/lib/membership/billing-shared";

export {
  isMembershipBillingSuspension,
  MEMBERSHIP_BILLING_SUSPENSION_REASON,
} from "@/lib/membership/billing-shared";

export async function vendorHasPendingMembershipCharges(vendorProfileId: string) {
  const pending = await prisma.membershipInvoice.findFirst({
    where: {
      vendorProfileId,
      status: "PENDING",
      amount: { gt: 0 },
    },
  });
  return pending != null;
}

export async function canReactivateVendorFromBilling(vendorProfileId: string) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: {
      suspensionReason: true,
    },
  });

  if (!vendor) {
    return false;
  }

  if (!isMembershipBillingSuspension(vendor.suspensionReason)) {
    return true;
  }

  return !(await vendorHasPendingMembershipCharges(vendorProfileId));
}

export async function syncVendorBillingAccess(vendorProfileId: string) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: {
      id: true,
      userId: true,
      onboardingStep: true,
      status: true,
      suspendedAt: true,
      suspensionReason: true,
      subscriptionStatus: true,
      subscriptionGracePeriodEndsAt: true,
    },
  });

  if (!vendor) {
    return { changed: false, action: "not_found" as const };
  }

  const now = new Date();
  const billingSuspended =
    vendor.subscriptionStatus === "SUSPENDED" ||
    (vendor.subscriptionStatus === "FAILED" &&
      vendor.subscriptionGracePeriodEndsAt != null &&
      now >= vendor.subscriptionGracePeriodEndsAt);

  if (billingSuspended) {
    await prisma.user.update({
      where: { id: vendor.userId },
      data: { status: "BLOCKED" },
    });

    if (
      vendor.status === "SUSPENDED" &&
      isMembershipBillingSuspension(vendor.suspensionReason)
    ) {
      return { changed: false, action: "already_suspended" as const };
    }

    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        status: "SUSPENDED",
        suspendedAt: vendor.suspendedAt ?? now,
        suspensionReason: MEMBERSHIP_BILLING_SUSPENSION_REASON,
        ...(vendor.subscriptionStatus === "FAILED"
          ? { subscriptionStatus: "SUSPENDED" }
          : {}),
      },
    });
    return { changed: true, action: "suspended" as const };
  }

  if (
    vendor.status === "SUSPENDED" &&
    isMembershipBillingSuspension(vendor.suspensionReason) &&
    (vendor.subscriptionStatus === "ACTIVE" || vendor.subscriptionStatus === "TRIAL")
  ) {
    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        status: "ACTIVE",
        suspendedAt: null,
        suspensionReason: null,
      },
    });
    await prisma.user.update({
      where: { id: vendor.userId },
      data: { status: "ACTIVE" },
    });
    return { changed: true, action: "reactivated" as const };
  }

  return { changed: false, action: "no_change" as const };
}

export async function restoreVendorBillingAccessAfterManualResolution(
  vendorProfileId: string
) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: {
      id: true,
      userId: true,
      onboardingStep: true,
      status: true,
      suspensionReason: true,
      subscriptionStatus: true,
      subscriptionGracePeriodEndsAt: true,
    },
  });

  if (!vendor) {
    return null;
  }

  const hasPending = await vendorHasPendingMembershipCharges(vendorProfileId);
  if (hasPending) {
    return vendor;
  }

  const billingSuspended = isMembershipBillingSuspension(vendor.suspensionReason);

  await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionGracePeriodEndsAt: null,
      subscriptionFailedAt: null,
      subscriptionFailedPaymentCount: 0,
      ...(billingSuspended
        ? {
            status: "ACTIVE",
            suspendedAt: null,
            suspensionReason: null,
          }
        : {}),
    },
  });

  if (billingSuspended && vendor.status === "SUSPENDED") {
    await prisma.user.update({
      where: { id: vendor.userId },
      data: { status: "ACTIVE" },
    });
  }

  return prisma.vendorProfile.findUnique({ where: { id: vendor.id } });
}

export function formatGracePeriodLabel(graceDays = env.MEMBERSHIP_GRACE_DAYS) {
  return graceDays === 1 ? "1 day" : `${graceDays} days`;
}
