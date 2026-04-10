export const deliveryMethods = ["PICKUP", "EXPRESS", "STANDARD"] as const;
export const deliveryRuleScopes = ["GLOBAL", "COUNTRY", "VENDOR"] as const;
export const deliveryPriceModels = ["FLAT", "PER_KM", "FREE_ABOVE"] as const;

export type DeliveryMethod = (typeof deliveryMethods)[number];
export type DeliveryRuleScope = (typeof deliveryRuleScopes)[number];
export type DeliveryPriceModel = (typeof deliveryPriceModels)[number];
