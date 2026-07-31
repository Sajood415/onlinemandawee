import { z } from "zod";

import {
  MAX_SUPPLY_REQUEST_IMAGES,
  isAllowedSupplyMediaUrl,
  sanitizeReferenceUrls,
  sanitizeSupplyMediaUrls,
} from "@/lib/supply/supply-request-media";
import {
  checkoutCurrencySchema,
  checkoutGuestEmailSchema,
  checkoutGuestNameSchema,
  checkoutGuestPhoneSchema,
} from "@/validators/checkout.validator";

const productNameSchema = z
  .string()
  .trim()
  .min(2, "Product name is required")
  .max(200);

const descriptionSchema = z
  .string()
  .trim()
  .min(10, "Describe the product (at least 10 characters)")
  .max(2000);

const citySchema = z
  .string()
  .trim()
  .min(2, "City is required")
  .max(120);

const addressSchema = z.string().trim().max(500);

const neededByDateSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a valid date"
  )
  .refine((value) => {
    if (!value) return true;
    const selected = new Date(`${value}T00:00:00`);
    if (Number.isNaN(selected.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected >= today;
  }, "Needed-by date cannot be in the past");

const mediaUrlSchema = z.string().trim().url();
const referenceUrlSchema = z.string().trim().url();

export const supplyRequestDeliveryModeSchema = z.enum(["SHIP", "PICKUP"]);

export const createSupplyRequestSchema = z
  .object({
    productName: productNameSchema,
    brand: z.string().trim().max(120).optional().or(z.literal("")),
    modelSku: z.string().trim().max(120).optional().or(z.literal("")),
    quantity: z.number().int().min(1).max(9999),
    description: descriptionSchema,
    referenceUrls: z.array(referenceUrlSchema).max(5).optional(),
    imageUrls: z.array(mediaUrlSchema).max(MAX_SUPPLY_REQUEST_IMAGES).optional(),
    categoryHint: z.string().trim().max(120).optional().or(z.literal("")),
    budgetMinMinor: z.number().int().min(0).optional().nullable(),
    budgetMaxMinor: z.number().int().min(0).optional().nullable(),
    budgetCurrency: checkoutCurrencySchema.optional(),
    neededByDate: neededByDateSchema,
    urgencyNote: z.string().trim().max(500).optional().or(z.literal("")),
    allowAlternatives: z.boolean().default(true),
    deliveryMode: supplyRequestDeliveryModeSchema,
    customerName: checkoutGuestNameSchema,
    customerEmail: checkoutGuestEmailSchema,
    customerPhone: checkoutGuestPhoneSchema,
    whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
    preferredContact: z.string().trim().max(40).optional().or(z.literal("")),
    city: citySchema,
    province: z.string().trim().max(120).optional().or(z.literal("")),
    address: addressSchema,
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMode === "SHIP" && data.address.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delivery address is required for shipping",
        path: ["address"],
      });
    }

    if (
      data.budgetMinMinor != null &&
      data.budgetMaxMinor != null &&
      data.budgetMaxMinor < data.budgetMinMinor
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Max budget must be greater than or equal to min budget",
        path: ["budgetMaxMinor"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    brand: data.brand?.trim() || null,
    modelSku: data.modelSku?.trim() || null,
    categoryHint: data.categoryHint?.trim() || null,
    neededByDate: data.neededByDate?.trim() || null,
    urgencyNote: data.urgencyNote?.trim() || null,
    whatsapp: data.whatsapp?.trim() || null,
    preferredContact: data.preferredContact?.trim() || null,
    province: data.province?.trim() || null,
    address: data.address.trim(),
    budgetMinMinor: data.budgetMinMinor ?? null,
    budgetMaxMinor: data.budgetMaxMinor ?? null,
    budgetCurrency: data.budgetCurrency ?? null,
    imageUrls: sanitizeSupplyMediaUrls(data.imageUrls, MAX_SUPPLY_REQUEST_IMAGES),
    referenceUrls: sanitizeReferenceUrls(data.referenceUrls, 5),
  }));

export type CreateSupplyRequestInput = z.infer<typeof createSupplyRequestSchema>;

export const supplyRequestStatusSchema = z.enum([
  "SUBMITTED",
  "REVIEWING",
  "AWAITING_PAYMENT",
  "IN_PROGRESS",
  "SHIPPED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
]);

export const adminSupplyRequestListQuerySchema = z.object({
  status: supplyRequestStatusSchema.optional(),
  search: z.string().trim().optional(),
});

export const updateSupplyRequestStatusSchema = z.object({
  status: supplyRequestStatusSchema,
});

export const supplyRequestIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const supplyRequestTrackTokenParamsSchema = z.object({
  token: z.string().min(1),
});

export const supplyRequestTrackQuerySchema = z.object({
  token: z.string().min(1),
});

export const sendSupplyRequestQuoteSchema = z
  .object({
    quoteAmountMinor: z.number().int().positive("Quote amount is required"),
    quoteCurrency: checkoutCurrencySchema,
    quoteNote: z.string().trim().max(2000).optional(),
    quoteImageUrl: z.string().trim().url().optional().or(z.literal("")),
  })
  .transform((data) => ({
    ...data,
    quoteNote: data.quoteNote?.trim() || null,
    quoteImageUrl: data.quoteImageUrl?.trim() || null,
  }))
  .refine(
    (data) => !data.quoteImageUrl || isAllowedSupplyMediaUrl(data.quoteImageUrl),
    {
      message: "Quote image must be uploaded through the platform",
      path: ["quoteImageUrl"],
    }
  );

export const markSupplyRequestOfflinePaidSchema = z.object({
  offlinePaymentNote: z.string().trim().max(500).optional(),
});

export const rejectSupplyRequestSchema = z.object({
  rejectReason: z.string().trim().min(5).max(1000),
});

export const shipSupplyRequestSchema = z.object({
  trackingRef: z.string().trim().min(1).max(200),
  carrierNote: z.string().trim().max(500).optional(),
});

export const refundSupplyRequestSchema = z.object({
  refundAmountMinor: z.number().int().positive(),
  refundNote: z.string().trim().min(3).max(1000),
});

export const requestSupplyInfoSchema = z.object({
  message: z.string().trim().min(5).max(2000),
});

export const confirmSupplyRequestPaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
});
