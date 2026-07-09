import { z } from "zod";

export const createProductReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating is required").max(5, "Rating must be between 1 and 5"),
  comment: z
    .string()
    .trim()
    .min(5, "Please write at least 5 characters")
    .max(1000, "Review must be at most 1000 characters"),
});

export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>;

export const productIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const reviewIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const publicProductReviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const adminProductReviewListQuerySchema = z.object({
  search: z.string().trim().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isHidden: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const setProductReviewVisibilitySchema = z.object({
  isHidden: z.boolean(),
});
