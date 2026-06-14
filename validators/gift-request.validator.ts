import { z } from "zod";

import {
  MAX_GIFT_REQUEST_IMAGES,
  MAX_GIFT_REQUEST_VIDEOS,
  isAllowedGiftMediaUrl,
  sanitizeGiftMediaUrls,
} from "@/lib/gifts/gift-request-media";
import { checkoutCurrencySchema } from "@/validators/checkout.validator";
import {
  checkoutGuestEmailSchema,
  checkoutGuestNameSchema,
  checkoutGuestPhoneSchema,
} from "@/validators/checkout.validator";

const recipientNameSchema = z
  .string()
  .trim()
  .min(2, "Recipient name is required")
  .max(100)
  .regex(/^[A-Za-z\s]+$/, "Recipient name must contain letters only");

const recipientPhoneSchema = z
  .string()
  .trim()
  .min(7, "Recipient phone must be at least 7 digits")
  .max(15, "Recipient phone must be at most 15 digits")
  .regex(/^\d+$/, "Recipient phone must contain numbers only");

const recipientCitySchema = z
  .string()
  .trim()
  .min(2, "City is required")
  .max(120)
  .regex(/^[A-Za-z\s]+$/, "City must contain letters only");

const recipientProvinceSchema = z
  .string()
  .trim()
  .max(120)
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => !value || /^[A-Za-z\s]+$/.test(value),
    "Province must contain letters only"
  );

const recipientAddressSchema = z
  .string()
  .trim()
  .min(5, "Delivery address is required")
  .max(500);

const occasionSchema = z.string().trim().max(80).optional();

const preferredDeliveryDateSchema = z
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
  }, "Delivery date cannot be in the past");

const preparationNotesSchema = z
  .string()
  .trim()
  .min(20, "Describe how you want the gift prepared (at least 20 characters)")
  .max(2000);

const deliveryInstructionsSchema = z
  .string()
  .trim()
  .min(10, "Describe how you want the gift delivered (at least 10 characters)")
  .max(1000);

const budgetNoteSchema = z.string().trim().max(200).optional();

const giftMediaUrlSchema = z.string().trim().url();

export const createGiftRequestSchema = z
  .object({
    senderName: checkoutGuestNameSchema,
    senderEmail: checkoutGuestEmailSchema,
    senderPhone: checkoutGuestPhoneSchema,
    recipientName: recipientNameSchema,
    recipientPhone: recipientPhoneSchema,
    recipientCity: recipientCitySchema,
    recipientProvince: recipientProvinceSchema,
    recipientAddress: recipientAddressSchema,
    occasion: occasionSchema,
    preferredDeliveryDate: preferredDeliveryDateSchema,
    preparationNotes: preparationNotesSchema,
    deliveryInstructions: deliveryInstructionsSchema,
    budgetNote: budgetNoteSchema,
    imageUrls: z.array(giftMediaUrlSchema).max(MAX_GIFT_REQUEST_IMAGES).optional(),
    videoUrls: z.array(giftMediaUrlSchema).max(MAX_GIFT_REQUEST_VIDEOS).optional(),
  })
  .transform((data) => ({
    ...data,
    imageUrls: sanitizeGiftMediaUrls(data.imageUrls, MAX_GIFT_REQUEST_IMAGES),
    videoUrls: sanitizeGiftMediaUrls(data.videoUrls, MAX_GIFT_REQUEST_VIDEOS),
  }));

export type CreateGiftRequestInput = z.infer<typeof createGiftRequestSchema>;

export const giftRequestStatusSchema = z.enum([
  "SUBMITTED",
  "REVIEWING",
  "AWAITING_PAYMENT",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const adminGiftRequestListQuerySchema = z.object({
  status: giftRequestStatusSchema.optional(),
  search: z.string().trim().optional(),
});

export const updateGiftRequestStatusSchema = z.object({
  status: giftRequestStatusSchema,
});

export const giftRequestIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const sendGiftRequestQuoteSchema = z
  .object({
    quoteAmountMinor: z.number().int().positive("Quote amount is required"),
    quoteCurrency: checkoutCurrencySchema,
    quoteNote: z.string().trim().max(1000).optional(),
    quoteImageUrl: z.string().trim().url("Gift preview image is required"),
  })
  .transform((data) => ({
    ...data,
    quoteNote: data.quoteNote?.trim() || null,
    quoteImageUrl: data.quoteImageUrl.trim(),
  }))
  .refine((data) => isAllowedGiftMediaUrl(data.quoteImageUrl), {
    message: "Gift preview image must be uploaded through the platform",
    path: ["quoteImageUrl"],
  });

export const markGiftRequestOfflinePaidSchema = z.object({
  offlinePaymentNote: z.string().trim().max(500).optional(),
});

export const confirmGiftRequestPaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
});
