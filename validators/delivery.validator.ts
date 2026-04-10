import { z } from "zod";

import {
  deliveryMethods,
  deliveryPriceModels,
  deliveryRuleScopes,
} from "@/domain/delivery/delivery-types";

export const deliveryRuleIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const deliveryRuleSchema = z
  .object({
    method: z.enum(deliveryMethods),
    scope: z.enum(deliveryRuleScopes),
    vendorProfileId: z.string().min(1).optional(),
    countryCode: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()).optional(),
    priceModel: z.enum(deliveryPriceModels),
    baseFeeAmount: z.number().int().min(0),
    perKmRateAmount: z.number().int().min(0).optional(),
    freeAboveAmount: z.number().int().min(0).optional(),
    etaMinDays: z.number().int().min(0).max(365),
    etaMaxDays: z.number().int().min(0).max(365),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.etaMaxDays < value.etaMinDays) {
      ctx.addIssue({
        code: "custom",
        path: ["etaMaxDays"],
        message: "etaMaxDays must be greater than or equal to etaMinDays",
      });
    }

    if (value.scope === "VENDOR" && !value.vendorProfileId) {
      ctx.addIssue({
        code: "custom",
        path: ["vendorProfileId"],
        message: "vendorProfileId is required for vendor-scoped rules",
      });
    }

    if (value.scope === "COUNTRY" && !value.countryCode) {
      ctx.addIssue({
        code: "custom",
        path: ["countryCode"],
        message: "countryCode is required for country-scoped rules",
      });
    }

    if (value.priceModel === "PER_KM" && value.perKmRateAmount === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["perKmRateAmount"],
        message: "perKmRateAmount is required for PER_KM rules",
      });
    }

    if (value.priceModel === "FREE_ABOVE" && value.freeAboveAmount === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["freeAboveAmount"],
        message: "freeAboveAmount is required for FREE_ABOVE rules",
      });
    }
  });

export const deliveryQuoteSchema = z.object({
  addressId: z.string().min(1),
  method: z.enum(deliveryMethods),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional(),
  distanceKm: z.number().min(0).max(100000).optional(),
});
