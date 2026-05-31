import { z } from "zod";

export const couponIdParamsSchema = z.object({
  id: z.string().min(1),
});

const vendorCouponFieldsSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code must be at least 3 characters")
    .max(32, "Code must be at most 32 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Code can only contain letters, numbers, hyphens, and underscores"),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number().int().positive(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  minOrderAmount: z.number().int().min(0).nullable().optional(),
  appliesToAllProducts: z.boolean().optional(),
  productIds: z.array(z.string().min(1)).optional(),
});

function validatePercentageDiscountCap(
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | undefined,
  discountValue: number | undefined,
  ctx: z.RefinementCtx
) {
  if (discountType === "PERCENTAGE" && discountValue != null && discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Percentage discount cannot exceed 100%",
      path: ["discountValue"],
    });
  }
}

function validateProductScope(
  appliesToAllProducts: boolean | undefined,
  productIds: string[] | undefined,
  ctx: z.RefinementCtx
) {
  if (appliesToAllProducts === false && (!productIds || productIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one product, or choose all products",
      path: ["productIds"],
    });
  }
}

export const createVendorCouponSchema = vendorCouponFieldsSchema.superRefine((value, ctx) => {
  validatePercentageDiscountCap(value.discountType, value.discountValue, ctx);
  validateProductScope(value.appliesToAllProducts ?? true, value.productIds, ctx);
});

export const updateVendorCouponSchema = vendorCouponFieldsSchema.partial().superRefine((value, ctx) => {
  validatePercentageDiscountCap(value.discountType, value.discountValue, ctx);
  if (value.appliesToAllProducts === false || value.productIds !== undefined) {
    validateProductScope(
      value.appliesToAllProducts ?? true,
      value.productIds ?? [],
      ctx
    );
  }
});
