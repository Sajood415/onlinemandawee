import "server-only";

import { SignJWT, jwtVerify } from "jose";

import { env } from "@/config/env";
import type { OtpPurpose } from "@/domain/auth/otp-purpose";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";

export type OtpProofPayload = {
  sub: string;
  purpose: OtpPurpose;
  type: "otp_proof";
};

const otpSecret = new TextEncoder().encode(env.JWT_OTP_SECRET);

export const signOtpProofToken = async (phone: string, purpose: OtpPurpose) => {
  return new SignJWT({
    sub: phone,
    purpose,
    type: "otp_proof",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(phone)
    .setIssuedAt()
    .setExpirationTime(env.JWT_OTP_TTL)
    .sign(otpSecret);
};

export const verifyOtpProofToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, otpSecret);

    if (payload.type !== "otp_proof" || typeof payload.purpose !== "string") {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid OTP proof token",
        statusCode: 401,
      });
    }

    return payload as unknown as OtpProofPayload;
  } catch {
    throw new AppError({
      code: ERROR_CODE.UNAUTHORIZED,
      message: "Invalid or expired OTP proof token",
      statusCode: 401,
    });
  }
};
