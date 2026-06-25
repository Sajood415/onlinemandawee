import { z } from "zod";

import { industryTypes } from "@/domain/vendor/vendor-types";
import { productApprovalStatuses } from "@/domain/catalog/product-approval-status";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  parentId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  parentId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const categoryIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createProductSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(5000),
  images: z.array(z.url().max(2048)).min(1).max(10),
  sku: z.string().trim().min(2).max(100).optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  priceAmount: z.number().int().positive().max(100000000),
  stockQty: z.number().int().min(0).max(1000000),
});

export const updateProductSchema = createProductSchema.extend({
  isActive: z.boolean().optional(),
});

export const productIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const productActionSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export const adminProductsQuerySchema = z.object({
  approvalStatus: z.enum(productApprovalStatuses).optional(),
  search: z.string().trim().min(1).optional(),
  vendorProfileId: z.string().trim().min(1).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value === "true"
    ),
});

export const adminUpdateProductSchema = updateProductSchema.extend({
  approvalStatus: z.enum(productApprovalStatuses).optional(),
  rejectionReason: z.string().trim().max(500).nullable().optional(),
});

export const publicProductsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  vendor: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export const categorySlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const storeSlugParamsSchema = z.object({
  storeSlug: z.string().min(1),
});

export const publicVendorsQuerySchema = z.object({
  industry: z.enum(industryTypes).optional(),
});
