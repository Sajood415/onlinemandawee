import type { DeliveryRuleScope } from "@/domain/delivery/delivery-types";
import { countryCodesMatch } from "@/lib/geo/shipping-locations";

export type DeliveryRuleMatchCandidate = {
  scope: DeliveryRuleScope;
  vendorProfileId: string | null;
  countryCode: string | null;
};

type MatchTarget = {
  vendorProfileId?: string;
  vendorProfileIds?: string[];
  countryCode?: string;
};

export function findBestMatchingDeliveryRule<T extends DeliveryRuleMatchCandidate>(
  rules: T[],
  target: MatchTarget
): T | null {
  const vendorIds = target.vendorProfileId
    ? [target.vendorProfileId]
    : [...new Set(target.vendorProfileIds ?? [])];

  if (vendorIds.length === 1) {
    const singleVendorRule = rules.find(
      (rule) => rule.scope === "VENDOR" && rule.vendorProfileId === vendorIds[0]
    );
    if (singleVendorRule) return singleVendorRule;
  }

  if (target.countryCode) {
    const countryRule = rules.find(
      (rule) =>
        rule.scope === "COUNTRY" &&
        rule.countryCode &&
        countryCodesMatch(rule.countryCode, target.countryCode)
    );
    if (countryRule) return countryRule;
  }

  const globalRule = rules.find((rule) => rule.scope === "GLOBAL");
  if (globalRule) return globalRule;

  for (const vendorProfileId of vendorIds) {
    const vendorRule = rules.find(
      (rule) => rule.scope === "VENDOR" && rule.vendorProfileId === vendorProfileId
    );
    if (vendorRule) return vendorRule;
  }

  return null;
}

export function hasMatchingDeliveryRule(
  rules: DeliveryRuleMatchCandidate[],
  target: MatchTarget
) {
  return findBestMatchingDeliveryRule(rules, target) != null;
}
