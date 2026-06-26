import { z } from "zod";

export const inboundShipOrderParamsSchema = z.object({
  id: z.string().min(1),
});

export const inboundShipmentParamsSchema = z.object({
  id: z.string().min(1),
});

export const consolidationBatchParamsSchema = z.object({
  id: z.string().min(1),
});

export const outboundShipmentParamsSchema = z.object({
  id: z.string().min(1),
});

export const vendorInboundShipSchema = z.object({
  trackingRef: z.string().trim().min(1).max(120).optional(),
});

export const adminConsolidateBatchSchema = z.object({
  trackingRef: z.string().trim().min(1).max(120).optional(),
});

export const adminOutboundShipSchema = z.object({
  trackingRef: z.string().trim().min(1).max(120).optional(),
});

export const adminInboundShipSchema = z.object({
  trackingRef: z.string().trim().min(1).max(120).optional(),
});
