import { z } from "zod";

import {
  businessTypes,
  industryTypes,
  kycDocumentTypes,
  payoutMethodTypes,
  sellerTypes,
} from "@/domain/vendor/vendor-types";
import { vendorStatuses } from "@/domain/vendor/vendor-status";
import { passwordFieldSchema } from "@/lib/auth/password-policy";
import { phoneFieldSchema } from "@/lib/phone/phone-policy";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";

const vendorOnboardingEmailField = z.preprocess(
  (v) => (typeof v === "string" ? normalizeEmailForAuth(v) : v),
  z.email().max(255)
);

export const vendorEmailSendCodeSchema = z.object({
  email: vendorOnboardingEmailField,
});

export const vendorEmailVerifyCodeSchema = z.object({
  email: vendorOnboardingEmailField,
  code: z.string().trim().regex(/^\d{6}$/),
});

export const startVendorOnboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: vendorOnboardingEmailField,
  phone: phoneFieldSchema,
  password: passwordFieldSchema,
  verificationToken: z.string().min(20),
});

export const vendorStoreInformationSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  businessType: z.enum(businessTypes),
  industryType: z.enum(industryTypes).optional(),
  logoUrl: z.url().max(2048).optional(),
  description: z.string().trim().max(500).optional(),
});

export const vendorKycSchema = z.object({
  documentType: z.enum(kycDocumentTypes),
  documentUrl: z.url().max(2048),
  selfieWithIdUrl: z.url().max(2048).optional(),
});

export const vendorAddressSchema = z.object({
  addressLine1: z.string().trim().min(3).max(255),
  city: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(2).max(40),
  proofOfAddressUrl: z.url().max(2048).optional(),
});

export const vendorPayoutSchema = z
  .object({
    method: z.enum(payoutMethodTypes),
    accountName: z.string().trim().min(2).max(120).optional(),
    accountNumberOrIban: z.string().trim().min(5).max(80).optional(),
    bankName: z.string().trim().min(2).max(120).optional(),
    stripeEmail: z.email().max(255).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === "BANK") {
      if (!value.accountName) {
        ctx.addIssue({
          code: "custom",
          path: ["accountName"],
          message: "Account name is required for bank payouts",
        });
      }

      if (!value.accountNumberOrIban) {
        ctx.addIssue({
          code: "custom",
          path: ["accountNumberOrIban"],
          message: "Account number or IBAN is required for bank payouts",
        });
      }

      if (!value.bankName) {
        ctx.addIssue({
          code: "custom",
          path: ["bankName"],
          message: "Bank name is required for bank payouts",
        });
      }
    }

    if (value.method === "STRIPE" && !value.stripeEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["stripeEmail"],
        message: "Stripe email is required for Stripe payouts",
      });
    }
  });

export const vendorAgreementsSchema = z.object({
  agreedToVendorTerms: z.literal(true),
  agreedToMembershipPolicy: z.literal(true),
  agreedToCommissionPolicy: z.literal(true),
  agreedToDisputePolicy: z.literal(true),
  agreedToDeliveryRules: z.literal(true),
});

export const adminVendorListQuerySchema = z.object({
  status: z.enum(vendorStatuses).optional(),
});

export const vendorActionSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export const adminVendorSellerTypeUpdateSchema = z.object({
  sellerType: z.enum(sellerTypes),
  confirmDowngrade: z.boolean().optional(),
});

export const vendorIdParamsSchema = z.object({
  id: z.string().min(1),
});
