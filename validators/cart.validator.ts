import { z } from "zod";

import { deliveryMethods } from "@/domain/delivery/delivery-types";

export const cartCurrencySchema = z.object({
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
});

export const addCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(1000),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(1000),
});

export const cartItemIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const cartQuoteSchema = z.object({
  addressId: z.string().min(1).optional(),
  method: z.enum(deliveryMethods).optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  distanceKm: z.number().min(0).max(100000).optional(),
});
