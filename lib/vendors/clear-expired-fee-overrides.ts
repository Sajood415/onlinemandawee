import {
  commissionOverrideExpired,
  membershipOverrideExpired,
} from "@/lib/vendors/fee-overrides";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { VendorSubscriptionService } from "@/services/vendor-subscription.service";

/**
 * Clear expired membership/commission overrides (silent).
 * Safe for PM2 workers — no Next.js `server-only` imports.
 */
export async function clearExpiredFeeOverrides(now = new Date()) {
  const vendorProfileRepository = new VendorProfileRepository();
  const vendorSubscriptionService = new VendorSubscriptionService();
  const rows = await vendorProfileRepository.listWithExpiredFeeOverrides(now);
  let clearedMembership = 0;
  let clearedCommission = 0;

  for (const vendor of rows) {
    const clearMembership = membershipOverrideExpired(vendor, now);
    const clearCommission = commissionOverrideExpired(vendor, now);
    if (!clearMembership && !clearCommission) continue;

    await vendorProfileRepository.updateFeeOverrides({
      vendorProfileId: vendor.id,
      membershipFeeAmountOverride: clearMembership
        ? null
        : (vendor.membershipFeeAmountOverride ?? null),
      membershipFeeOverrideEndsAt: clearMembership
        ? null
        : (vendor.membershipFeeOverrideEndsAt ?? null),
      commissionRateBpsOverride: clearCommission
        ? null
        : (vendor.commissionRateBpsOverride ?? null),
      commissionRateOverrideEndsAt: clearCommission
        ? null
        : (vendor.commissionRateOverrideEndsAt ?? null),
    });

    if (clearMembership) {
      clearedMembership += 1;
      try {
        await vendorSubscriptionService.syncMembershipBillingAfterFeeChange(vendor.id);
      } catch {
        // Best effort Stripe resync after membership override expiry.
      }
    }
    if (clearCommission) clearedCommission += 1;
  }

  return {
    scanned: rows.length,
    clearedMembership,
    clearedCommission,
  };
}
