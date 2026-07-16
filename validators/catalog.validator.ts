import { z } from "zod";

import { industryTypes } from "@/domain/vendor/vendor-types";
import { productApprovalStatuses } from "@/domain/catalog/product-approval-status";

export const categoryTranslationsSchema = z
  .object({
    ps: z.object({ name: z.string().trim().min(2).max(120).optional() }).optional(),
    "fa-AF": z.object({ name: z.string().trim().min(2).max(120).optional() }).optional(),
  })
  .optional();

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  translations: categoryTranslationsSchema,
  imageUrl: z.string().trim().max(2048).optional(),
  parentId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  translations: categoryTranslationsSchema,
  imageUrl: z.string().trim().max(2048).nullable().optional(),
  parentId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const categoryIdParamsSchema = z.object({
  id: z.string().min(1),
});

const localeProductContentSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
});

export const productTranslationsSchema = z
  .object({
    ps: localeProductContentSchema.optional(),
    "fa-AF": localeProductContentSchema.optional(),
  })
  .optional();

export const createProductSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(5000),
  translations: productTranslationsSchema,
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

const queryBooleanSchema = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === "true"));

export const publicCatalogSortValues = [
  "newest",
  "price-asc",
  "price-desc",
  "rating",
  "relevance",
] as const;

export const publicProductsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  vendor: z.string().trim().min(1).optional(),
  vendors: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : undefined
    ),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(24),
  sort: z.enum(publicCatalogSortValues).optional().default("newest"),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: queryBooleanSchema,
  onSale: queryBooleanSchema,
});

export type PublicProductsQuery = z.infer<typeof publicProductsQuerySchema>;
export type PublicCatalogSort = (typeof publicCatalogSortValues)[number];

export const categorySlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const storeSlugParamsSchema = z.object({
  storeSlug: z.string().min(1),
});

export const publicVendorsQuerySchema = z.object({
  industry: z.enum(industryTypes).optional(),
});
