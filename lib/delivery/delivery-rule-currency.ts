import { convertMinorUnits } from "@/lib/currency/convert";

/** Admin-configured delivery rule amounts are stored in USD minor units. */
export const DELIVERY_RULE_CURRENCY = "USD";

export function convertDeliveryRuleAmountMinor(
  amountMinor: number,
  targetCurrency: string
) {
  return convertMinorUnits(amountMinor, DELIVERY_RULE_CURRENCY, targetCurrency);
}
