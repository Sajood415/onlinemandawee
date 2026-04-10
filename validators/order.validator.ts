import { z } from "zod";

import { deliveryMethods } from "@/domain/delivery/delivery-types";
import { vendorOrderStatuses } from "@/domain/order/order-status";

export const createOrderSchema = z.object({
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

export const orderIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const vendorOrderStatusSchema = z.object({
  status: z.enum(vendorOrderStatuses).refine(
    (value) => value !== "NEW",
    "Vendor order cannot be reset to NEW"
  ),
});
