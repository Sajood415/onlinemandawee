import { z } from "zod";

export const promoBannerIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createVendorPromoBannerSchema = z.object({
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(200).nullable().optional(),
  imageUrl: z.string().url(),
  couponId: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const updateVendorPromoBannerSchema = createVendorPromoBannerSchema.partial();
