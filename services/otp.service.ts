import { env } from "@/config/env";
import { signOtpProofToken } from "@/lib/auth/otp-proof";
import { parseOtpIdentifier } from "@/lib/auth/otp-identifier";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import { buildVendorSignupOtpEmailHtml } from "@/lib/mail/vendor-signup-otp-email-html";
import { generateOtpCode, sha256 } from "@/lib/utils/crypto";
import { OtpCodeRepository } from "@/repositories/otp-code.repository";

import type { OtpPurpose } from "@/domain/auth/otp-purpose";

type SendOtpInput = {
  identifier: string;
  purpose: OtpPurpose;
};

type VerifyOtpInput = {
  identifier: string;
  purpose: OtpPurpose;
  code: string;
};

export class OtpService {
  constructor(private readonly otpCodeRepository = new OtpCodeRepository()) {}

  async sendOtp(input: SendOtpInput) {
    const parsed = parseOtpIdentifier(input.identifier);
    if (!parsed) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Enter a valid phone number or email",
        statusCode: 400,
      });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
    const codeHash = sha256(
      `${parsed.value}:${input.purpose}:${otpCode}:${env.OTP_PEPPER}`
    );

    if (parsed.kind === "email") {
      await this.otpCodeRepository.invalidateActiveForEmail(
        parsed.value,
        input.purpose
      );
    } else {
      await this.otpCodeRepository.invalidateActiveForPhone(
        parsed.value,
        input.purpose
      );
    }

    await this.otpCodeRepository.create({
      phone: parsed.value,
      purpose: input.purpose,
      codeHash,
      expiresAt,
    });

    if (parsed.kind === "email") {
      await sendTransactionalEmail({
        to: parsed.value,
        subject: `${env.APP_NAME} — verification code`,
        text: `Your verification code is: ${otpCode}\n\nIt expires in ${env.OTP_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
        html: buildVendorSignupOtpEmailHtml({
          code: otpCode,
          minutes: env.OTP_TTL_MINUTES,
          appName: env.APP_NAME,
        }),
      });
    }

    return {
      identifier: parsed.value,
      purpose: input.purpose,
      expiresAt: expiresAt.toISOString(),
      ...(env.NODE_ENV !== "production" ? { debugCode: otpCode } : {}),
    };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const parsed = parseOtpIdentifier(input.identifier);
    if (!parsed) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Enter a valid phone number or email",
        statusCode: 400,
      });
    }

    const otpCode =
      parsed.kind === "email"
        ? await this.otpCodeRepository.findLatestActiveForEmail(
            parsed.value,
            input.purpose
          )
        : await this.otpCodeRepository.findLatestActiveForPhone(
            parsed.value,
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
      `${parsed.value}:${input.purpose}:${input.code}:${env.OTP_PEPPER}`
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
      parsed.value,
      input.purpose
    );

    return {
      identifier: parsed.value,
      purpose: input.purpose,
      verificationToken,
    };
  }
}
