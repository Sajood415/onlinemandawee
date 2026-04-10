import { env } from "@/config/env";
import { signOtpProofToken } from "@/lib/auth/otp-proof";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { generateOtpCode, sha256 } from "@/lib/utils/crypto";
import { OtpCodeRepository } from "@/repositories/otp-code.repository";

import type { OtpPurpose } from "@/domain/auth/otp-purpose";

type SendOtpInput = {
  phone: string;
  purpose: OtpPurpose;
};

type VerifyOtpInput = {
  phone: string;
  purpose: OtpPurpose;
  code: string;
};

export class OtpService {
  constructor(private readonly otpCodeRepository = new OtpCodeRepository()) {}

  async sendOtp(input: SendOtpInput) {
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
    const codeHash = sha256(
      `${input.phone}:${input.purpose}:${otpCode}:${env.OTP_PEPPER}`
    );

    await this.otpCodeRepository.invalidateActive(input.phone, input.purpose);
    await this.otpCodeRepository.create({
      phone: input.phone,
      purpose: input.purpose,
      codeHash,
      expiresAt,
    });

    return {
      phone: input.phone,
      purpose: input.purpose,
      expiresAt: expiresAt.toISOString(),
      ...(env.NODE_ENV !== "production" ? { debugCode: otpCode } : {}),
    };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const otpCode = await this.otpCodeRepository.findLatestActive(
      input.phone,
      input.purpose
    );

    if (!otpCode) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "OTP challenge not found",
        statusCode: 404,
      });
    }

    if (otpCode.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "OTP attempts exceeded",
        statusCode: 403,
      });
    }

    const codeHash = sha256(
      `${input.phone}:${input.purpose}:${input.code}:${env.OTP_PEPPER}`
    );

    if (codeHash !== otpCode.codeHash) {
      await this.otpCodeRepository.incrementAttempts(otpCode.id);

      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid OTP code",
        statusCode: 401,
      });
    }

    await this.otpCodeRepository.consume(otpCode.id);

    const verificationToken = await signOtpProofToken(
      input.phone,
      input.purpose
    );

    return {
      phone: input.phone,
      purpose: input.purpose,
      verificationToken,
    };
  }
}
