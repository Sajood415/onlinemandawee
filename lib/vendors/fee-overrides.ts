import { env } from "@/config/env.shared";
import {
  DEFAULT_COMMISSION_RATE_BPS,
  formatCommissionRatePercent,
} from "@/lib/platform/transaction-fee";

export type VendorFeeOverrideSource = {
  sellerType?: "PLATFORM" | "THIRD_PARTY" | null;
  membershipFeeAmountOverride?: number | null;
  membershipFeeOverrideEndsAt?: Date | string | null;
  commissionRateBpsOverride?: number | null;
  commissionRateOverrideEndsAt?: Date | string | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOverrideActive(endsAt: Date | string | null | undefined, now = new Date()) {
  const end = toDate(endsAt);
  if (!end) return true;
  return end.getTime() > now.getTime();
}

export function isMembershipOverrideActive(
  vendor: VendorFeeOverrideSource,
  now = new Date()
): boolean {
  if (vendor.sellerType === "PLATFORM") return false;
  if (vendor.membershipFeeAmountOverride == null) return false;
  return isOverrideActive(vendor.membershipFeeOverrideEndsAt, now);
}

export function isCommissionOverrideActive(
  vendor: VendorFeeOverrideSource,
  now = new Date()
): boolean {
  if (vendor.sellerType === "PLATFORM") return false;
  if (vendor.commissionRateBpsOverride == null) return false;
  return isOverrideActive(vendor.commissionRateOverrideEndsAt, now);
}

/** Monthly membership amount in minor units (cents). */
export function resolveMembershipFeeAmountMinor(
  vendor: VendorFeeOverrideSource,
  now = new Date()
): number {
  if (vendor.sellerType === "PLATFORM") return 0;
  if (isMembershipOverrideActive(vendor, now)) {
    return Math.max(0, vendor.membershipFeeAmountOverride ?? 0);
  }
  return env.MEMBERSHIP_FEE_AMOUNT;
}

export function isMembershipFeeWaived(
  vendor: VendorFeeOverrideSource,
  now = new Date()
): boolean {
  if (vendor.sellerType === "PLATFORM") return true;
  return resolveMembershipFeeAmountMinor(vendor, now) === 0;
}

/** Sales commission in basis points (399 = 3.99%). */
export function resolveCommissionRateBps(
  vendor: VendorFeeOverrideSource,
  now = new Date()
): number {
  if (vendor.sellerType === "PLATFORM") return 0;
  if (isCommissionOverrideActive(vendor, now)) {
    return Math.max(0, Math.min(10_000, vendor.commissionRateBpsOverride ?? 0));
  }
  return env.COMMISSION_RATE_BPS || DEFAULT_COMMISSION_RATE_BPS;
}

export function isCommissionWaived(
  vendor: VendorFeeOverrideSource,
  now = new Date()
): boolean {
  return resolveCommissionRateBps(vendor, now) === 0;
}

export function describeCommissionRate(
  vendor: VendorFeeOverrideSource,
  now = new Date()
): string {
  const bps = resolveCommissionRateBps(vendor, now);
  if (bps <= 0) return "0%";
  return formatCommissionRatePercent(bps);
}

export function defaultMembershipFeeAmountMinor(): number {
  return env.MEMBERSHIP_FEE_AMOUNT;
}

export function defaultCommissionRateBps(): number {
  return env.COMMISSION_RATE_BPS || DEFAULT_COMMISSION_RATE_BPS;
}

export function membershipOverrideExpired(vendor: VendorFeeOverrideSource, now = new Date()) {
  return (
    vendor.membershipFeeAmountOverride != null &&
    !isOverrideActive(vendor.membershipFeeOverrideEndsAt, now)
  );
}

export function commissionOverrideExpired(vendor: VendorFeeOverrideSource, now = new Date()) {
  return (
    vendor.commissionRateBpsOverride != null &&
    !isOverrideActive(vendor.commissionRateOverrideEndsAt, now)
  );
}
