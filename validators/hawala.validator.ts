import { z } from "zod";

import { hawalaTransferStatuses } from "@/domain/hawala/hawala-transfer-status";
import { HAWALA_CURRENCIES } from "@/lib/hawala/constants";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name is required")
  .max(100)
  .regex(/^[A-Za-z\s'.-]+$/, "Name must contain letters only");

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number must be at least 7 digits")
  .max(20, "Phone number must be at most 20 digits")
  .regex(/^[+\d\s-]+$/, "Enter a valid phone number");

const countrySchema = z
  .string()
  .trim()
  .min(2, "Country is required")
  .max(80)
  .regex(/^[A-Za-z\s'.-]+$/, "Country must contain letters only");

const addressSchema = z
  .string()
  .trim()
  .min(5, "Address is required")
  .max(500);

const bankNameSchema = z.string().trim().min(2, "Bank name is required").max(150);

const accountNumberSchema = z
  .string()
  .trim()
  .min(4, "Account number is required")
  .max(40)
  .regex(/^[A-Za-z0-9\s-]+$/, "Account number can only contain letters and numbers");

const hawalaCurrencySchema = z.enum(HAWALA_CURRENCIES);

export const createHawalaTransferSchema = z.object({
  senderName: nameSchema,
  senderPhone: phoneSchema,
  senderEmail: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  senderCountry: countrySchema,
  senderAddress: addressSchema,
  senderBankName: bankNameSchema,
  senderAccountNumber: accountNumberSchema,

  receiverName: nameSchema,
  receiverPhone: phoneSchema,
  receiverCountry: countrySchema,
  receiverAddress: addressSchema,
  receiverBankName: bankNameSchema,
  receiverAccountNumber: accountNumberSchema,

  sendAmount: z.number().positive("Enter an amount greater than 0").max(1_000_000),
  sendCurrency: hawalaCurrencySchema,
  receiveCurrency: hawalaCurrencySchema,
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateHawalaTransferInput = z.infer<typeof createHawalaTransferSchema>;

export const hawalaTransferStatusSchema = z.enum(hawalaTransferStatuses);

export const adminHawalaTransferListQuerySchema = z.object({
  status: hawalaTransferStatusSchema.optional(),
  search: z.string().trim().optional(),
});

export const updateHawalaTransferStatusSchema = z.object({
  status: hawalaTransferStatusSchema,
  adminNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const hawalaTransferIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const upsertHawalaExchangeRatesSchema = z.object({
  rates: z
    .array(
      z.object({
        currency: hawalaCurrencySchema,
        rateToAfn: z.number().positive("Rate must be greater than 0"),
      })
    )
    .min(1),
});

export type UpsertHawalaExchangeRatesInput = z.infer<
  typeof upsertHawalaExchangeRatesSchema
>;
