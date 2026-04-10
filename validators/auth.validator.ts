import { z } from "zod";

import { otpPurposes } from "@/domain/auth/otp-purpose";

export const sendOtpSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  purpose: z.enum(otpPurposes),
});

export const verifyOtpSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  purpose: z.enum(otpPurposes),
  code: z.string().trim().regex(/^\d{6}$/),
});

export const registerCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.email().max(255),
  phone: z.string().trim().min(8).max(20),
  password: z.string().min(8).max(128),
  verificationToken: z.string().min(20),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(8).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});
