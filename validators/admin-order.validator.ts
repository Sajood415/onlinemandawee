import { z } from "zod";

import { adminOrderStatusFilters } from "@/domain/order/order-status";

export const adminOrderListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    vendorProfileId: z.string().trim().min(1).optional(),
    statusFilter: z.enum(adminOrderStatusFilters).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    search: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "to must be on or after from",
      });
    }
  });

export const adminOrderIdParamsSchema = z.object({
  id: z.string().min(1),
});
