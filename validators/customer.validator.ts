import { z } from "zod";

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
