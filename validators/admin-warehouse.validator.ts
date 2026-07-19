import { z } from "zod";

export const adminWarehousePagingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
});

export const adminInboundShipmentListQuerySchema = adminWarehousePagingQuerySchema.extend({
  status: z.enum(["PENDING_SHIPMENT", "INBOUND_SHIPPED", "RECEIVED"]).optional(),
});

export const adminConsolidationBatchListQuerySchema = adminWarehousePagingQuerySchema.extend({
  status: z
    .enum([
      "OPEN",
      "PARTIALLY_RECEIVED",
      "READY_TO_CONSOLIDATE",
      "CONSOLIDATED",
      "OUTBOUND_SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ])
    .optional(),
});

export const adminOutboundShipmentListQuerySchema = adminWarehousePagingQuerySchema.extend({
  status: z.enum(["CONSOLIDATED", "OUTBOUND_SHIPPED", "DELIVERED"]).optional(),
});
