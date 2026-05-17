import { z } from "zod";

import { otpPurposes } from "@/domain/auth/otp-purpose";
import { passwordFieldSchema } from "@/lib/auth/password-policy";
import { phoneFieldSchema } from "@/lib/phone/phone-policy";

export const sendOtpSchema = z.object({
  phone: phoneFieldSchema,
  purpose: z.enum(otpPurposes),
});

export const verifyOtpSchema = z.object({
  phone: phoneFieldSchema,
  purpose: z.enum(otpPurposes),
  code: z.string().trim().regex(/^\d{6}$/),
});

export const registerCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.email().max(255),
  phone: phoneFieldSchema,
  password: passwordFieldSchema,
  verificationToken: z.string().min(20),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(1).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.email().max(255),
});

export const forgotPasswordVerifySchema = z.object({
  email: z.email().max(255),
  code: z.string().trim().regex(/^\d{6}$/),
});

export const forgotPasswordResetSchema = z.object({
  email: z.email().max(255),
  resetToken: z.string().min(20),
  newPassword: passwordFieldSchema,
});
