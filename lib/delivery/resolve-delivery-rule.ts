import type { DeliveryMethod } from "@/domain/delivery/delivery-types";
import {
  FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR,
  usesFixedTransactionFeeDeliveryMethod,
} from "@/lib/platform/transaction-fee";

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

export function resolveTransactionFeeAmountMinor(input: {
  deliveryMethod?: DeliveryMethod | null;
  ruleTransactionFeeAmountMinor?: number | null;
  fallbackAmountMinor?: number;
}) {
  if (usesFixedTransactionFeeDeliveryMethod(input.deliveryMethod ?? null)) {
    return FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR;
  }

  if (
    input.ruleTransactionFeeAmountMinor != null &&
    input.ruleTransactionFeeAmountMinor >= 0
  ) {
    return input.ruleTransactionFeeAmountMinor;
  }

  return input.fallbackAmountMinor ?? FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR;
}

export function resolveOrderTransactionFeeTarget(input: {
  vendorProfileIds: string[];
}) {
  return input.vendorProfileIds.length === 1
    ? input.vendorProfileIds[0]
    : undefined;
}

export function defaultTransactionFeeFallback() {
  return FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR;
}

export type { DeliveryMethod };
