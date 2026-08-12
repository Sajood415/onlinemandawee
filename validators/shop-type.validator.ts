import { z } from "zod";

const translationNameSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
  })
  .optional();

export const shopTypeTranslationsSchema = z
  .object({
    ps: translationNameSchema,
    "fa-AF": translationNameSchema,
  })
  .optional()
  .nullable();

const shopTypeImageSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .optional()
  .nullable();

export const createShopTypeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Za-z0-9_]+$/, "Slug may only contain letters, numbers, and underscores")
    .optional(),
  translations: shopTypeTranslationsSchema,
  image: shopTypeImageSchema,
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const updateShopTypeSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  translations: shopTypeTranslationsSchema,
  image: shopTypeImageSchema,
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const shopTypeIdParamsSchema = z.object({
  id: z.string().min(1),
});
