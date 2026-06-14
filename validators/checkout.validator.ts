import { z } from "zod";

import { SUPPORTED_CURRENCIES } from "@/lib/currency/constants";

const lettersOnlyField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(120)
    .regex(/^[A-Za-z\s]+$/, `${label} must contain letters only`);

export const checkoutGuestNameSchema = z
  .string()
  .trim()
  .min(2, "Full name is required")
  .max(100)
  .regex(/^[A-Za-z\s]+$/, "Name must contain letters only");

export const checkoutGuestEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const checkoutGuestPhoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number must be at least 7 digits")
  .max(15, "Phone number must be at most 15 digits")
  .regex(/^\d+$/, "Phone must contain numbers only");

export const checkoutAddressLineSchema = z
  .string()
  .trim()
  .min(1, "Street address is required")
  .max(255);

export const checkoutCitySchema = lettersOnlyField("City");
export const checkoutCountrySchema = lettersOnlyField("Country");

export const checkoutPostalCodeSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), {
    message: "Postal code must contain numbers only",
  });

export const checkoutCurrencySchema = z.enum(SUPPORTED_CURRENCIES).default("USD");

export const checkoutShippingContactSchema = z.object({
  guestName: checkoutGuestNameSchema,
  guestEmail: checkoutGuestEmailSchema,
  guestPhone: checkoutGuestPhoneSchema,
  addressLine1: checkoutAddressLineSchema,
  city: checkoutCitySchema,
  country: checkoutCountrySchema,
  postalCode: checkoutPostalCodeSchema.default(""),
});

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
  addressLine1: checkoutAddressLineSchema,
  city: checkoutCitySchema,
  country: checkoutCountrySchema,
  postalCode: checkoutPostalCodeSchema.optional(),
});
