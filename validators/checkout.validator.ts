import { z } from "zod";

export const guestCheckoutCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const vendorCouponEntrySchema = z.object({
  code: z.string().trim().min(1),
  vendorProfileId: z.string().min(1),
});

export const guestCheckoutCouponsSchema = z.object({
  vendorCoupons: z.array(vendorCouponEntrySchema).optional(),
  couponCodes: z.array(z.string().trim().min(1)).optional(),
});

export const guestCheckoutDeliveryAddressSchema = z.object({
  addressLine1: z.string().trim().min(1),
  city: z.string().trim().min(1),
  country: z.string().trim().min(1),
  postalCode: z.string().trim().optional(),
});
