import { z } from "zod";

import { passwordFieldSchema } from "@/lib/auth/password-policy";
import { phoneFieldSchema } from "@/lib/phone/phone-policy";

export const updateCustomerProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: phoneFieldSchema,
});

export const changeCustomerPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordFieldSchema,
});

export const createCustomerAddressSchema = z.object({
  label: z.string().trim().max(60).optional(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  addressLine1: z.string().trim().min(3).max(255),
  city: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(2).max(40),
  isDefault: z.boolean().optional(),
});

export const customerAddressIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateCustomerAddressSchema = createCustomerAddressSchema;
