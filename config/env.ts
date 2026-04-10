import "server-only";

import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("Online Mandawee"),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_OTP_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().min(2).default("15m"),
  JWT_REFRESH_TTL: z.string().min(2).default("7d"),
  JWT_OTP_TTL: z.string().min(2).default("15m"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  OTP_PEPPER: z.string().min(16),
  OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(30).default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  PASSWORD_HASH_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  COMMISSION_RATE_BPS: z.coerce.number().int().min(1).max(10000).default(399),
  PAYOUT_HOLD_DAYS: z.coerce.number().int().min(0).max(30).default(5),
  STRIPE_WEBHOOK_SECRET: z.string().min(16),
  PAYPAL_WEBHOOK_SECRET: z.string().min(16),
  MEMBERSHIP_FEE_AMOUNT: z.coerce.number().int().min(0).default(599),
  MEMBERSHIP_TRIAL_DAYS: z.coerce.number().int().min(0).max(365).default(90),
  MEMBERSHIP_INVOICE_CURRENCY: z.string().trim().length(3).default("USD"),
});

const parsedEnv = envSchema.safeParse({
  APP_NAME: process.env.APP_NAME,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_OTP_SECRET: process.env.JWT_OTP_SECRET,
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL,
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL,
  JWT_OTP_TTL: process.env.JWT_OTP_TTL,
  NODE_ENV: process.env.NODE_ENV,
  OTP_PEPPER: process.env.OTP_PEPPER,
  OTP_TTL_MINUTES: process.env.OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS: process.env.OTP_MAX_ATTEMPTS,
  PASSWORD_HASH_ROUNDS: process.env.PASSWORD_HASH_ROUNDS,
  COMMISSION_RATE_BPS: process.env.COMMISSION_RATE_BPS,
  PAYOUT_HOLD_DAYS: process.env.PAYOUT_HOLD_DAYS,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  PAYPAL_WEBHOOK_SECRET: process.env.PAYPAL_WEBHOOK_SECRET,
  MEMBERSHIP_FEE_AMOUNT: process.env.MEMBERSHIP_FEE_AMOUNT,
  MEMBERSHIP_TRIAL_DAYS: process.env.MEMBERSHIP_TRIAL_DAYS,
  MEMBERSHIP_INVOICE_CURRENCY: process.env.MEMBERSHIP_INVOICE_CURRENCY,
});

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsedEnv.error.flatten().fieldErrors)}`
  );
}

export const env = parsedEnv.data;
