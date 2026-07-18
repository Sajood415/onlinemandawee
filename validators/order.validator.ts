import { z } from "zod";

import { deliveryMethods } from "@/domain/delivery/delivery-types";
import { vendorOrderStatuses } from "@/domain/order/order-status";

export const createOrderSchema = z
  .object({
    addressId: z.string().min(1).optional(),
    method: z.enum(deliveryMethods),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .optional(),
    distanceKm: z.number().min(0).max(100000).optional(),
  })
  .superRefine((value, ctx) => {
    // Pickup: no delivery address. Express / Standard still need one.
    if (value.method !== "PICKUP" && !value.addressId) {
      ctx.addIssue({
        code: "custom",
        path: ["addressId"],
        message: "addressId is required for Express and Standard delivery",
      });
    }
  });

export const orderIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const vendorOrderStatusSchema = z.object({
  status: z.enum(vendorOrderStatuses).refine(
    (value) =>
      value === "PREPARING" ||
      value === "SHIPPED" ||
      value === "DELIVERED" ||
      value === "CANCELLED",
    "Unsupported status update"
  ),
});

export const cancelOrderBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
