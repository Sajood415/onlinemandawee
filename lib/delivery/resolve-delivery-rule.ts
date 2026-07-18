import type { DeliveryMethod } from "@/domain/delivery/delivery-types";

type DeliveryRuleRecord = {
  id: string;
  scope: "GLOBAL" | "COUNTRY" | "VENDOR";
  vendorProfileId: string | null;
  countryCode: string | null;
  transactionFeeAmountMinor: number | null;
};

export function pickBestDeliveryRule<T extends DeliveryRuleRecord>(
  rules: T[],
  target: {
    vendorProfileId?: string;
    countryCode?: string;
  }
): T | null {
  const vendorRule = target.vendorProfileId
    ? rules.find(
        (rule) =>
          rule.scope === "VENDOR" && rule.vendorProfileId === target.vendorProfileId
      )
    : null;

  if (vendorRule) return vendorRule;

  const countryRule = target.countryCode
    ? rules.find(
        (rule) =>
          rule.scope === "COUNTRY" &&
          rule.countryCode?.toUpperCase() === target.countryCode?.toUpperCase()
      )
    : null;

  if (countryRule) return countryRule;

  return rules.find((rule) => rule.scope === "GLOBAL") ?? null;
}

/**
 * @deprecated Platform commission is percentage-based and resolved at settlement
 * via COMMISSION_RATE_BPS. Delivery rules no longer store a flat transaction fee.
 */
export function resolveTransactionFeeAmountMinor(_input: {
  deliveryMethod?: DeliveryMethod | null;
  ruleTransactionFeeAmountMinor?: number | null;
  fallbackAmountMinor?: number;
}) {
  return 0;
}

export function resolveOrderTransactionFeeTarget(input: {
  vendorProfileIds: string[];
}) {
  return input.vendorProfileIds.length === 1
    ? input.vendorProfileIds[0]
    : undefined;
}

/** @deprecated */
export function defaultTransactionFeeFallback() {
  return 0;
}

export type { DeliveryMethod };
