import "server-only";

import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("Online Mandawee"),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().min(2).default("15m"),
  JWT_REFRESH_TTL: z.string().min(2).default("7d"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  OTP_PEPPER: z.string().min(16),
});

const parsedEnv = envSchema.safeParse({
  APP_NAME: process.env.APP_NAME,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL,
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL,
  NODE_ENV: process.env.NODE_ENV,
  OTP_PEPPER: process.env.OTP_PEPPER,
});

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsedEnv.error.flatten().fieldErrors)}`
  );
}

export const env = parsedEnv.data;
