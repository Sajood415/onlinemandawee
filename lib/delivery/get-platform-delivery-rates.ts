import "server-only";

import { env } from "@/config/env";
import { DeliveryRuleRepository } from "@/repositories/delivery-rule.repository";

export type PlatformDeliveryRates = {
  baseFeeAmount: number;
  perKmRateAmount: number;
  source: "delivery_rule" | "env";
};

export async function getPlatformDeliveryRates(): Promise<PlatformDeliveryRates> {
  const deliveryRuleRepository = new DeliveryRuleRepository();
  const activeRules = await deliveryRuleRepository.listActiveByMethod("STANDARD");
  const globalPerKmRule = activeRules.find(
    (rule) => rule.scope === "GLOBAL" && rule.priceModel === "PER_KM"
  );

  if (globalPerKmRule) {
    return {
      baseFeeAmount: globalPerKmRule.baseFeeAmount,
      perKmRateAmount: globalPerKmRule.perKmRateAmount ?? 0,
      source: "delivery_rule",
    };
  }

  return {
    baseFeeAmount: env.PLATFORM_DELIVERY_BASE_FEE_CENTS,
    perKmRateAmount: env.PLATFORM_DELIVERY_PER_KM_CENTS,
    source: "env",
  };
}
