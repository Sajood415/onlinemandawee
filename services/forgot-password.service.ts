import { env } from "@/config/env";
import { signOtpProofToken, verifyOtpProofToken } from "@/lib/auth/otp-proof";
import { hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import { buildVendorSignupOtpEmailHtml } from "@/lib/mail/vendor-signup-otp-email-html";
import { generateOtpCode, sha256 } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { OtpCodeRepository } from "@/repositories/otp-code.repository";
import { UserRepository } from "@/repositories/user.repository";

export class ForgotPasswordService {
  constructor(
    private readonly otpCodeRepository = new OtpCodeRepository(),
    private readonly userRepository = new UserRepository()
  ) {}

  async requestReset(email: string) {
    const normalized = normalizeEmailForAuth(email);
    const user = await this.userRepository.findByEmail(normalized);

    if (!user) {
      return { success: true };
    }

    const otpCode = generateOtpCode();
    const purpose = "PASSWORD_RESET" as const;
    const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
    const codeHash = sha256(
      `${normalized}:${purpose}:${otpCode}:${env.OTP_PEPPER}`
    );

    await this.otpCodeRepository.invalidateActiveForEmail(normalized, purpose);
    await this.otpCodeRepository.create({
      phone: normalized,
      purpose,
      codeHash,
      expiresAt,
    });

    const smtpConfigured = Boolean(env.SMTP_HOST);
    if (smtpConfigured) {
      await sendTransactionalEmail({
        to: normalized,
        subject: `${env.APP_NAME} — password reset code`,
        text: `Your password reset code is: ${otpCode}\n\nIt expires in ${env.OTP_TTL_MINUTES} minutes.`,
        html: buildVendorSignupOtpEmailHtml({
          code: otpCode,
          minutes: env.OTP_TTL_MINUTES,
          appName: env.APP_NAME,
        }),
      });
    } else if (env.NODE_ENV === "production") {
      throw new AppError({
        code: ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: "Email is not configured (SMTP_HOST)",
        statusCode: 503,
      });
    }

    return {
      success: true,
      ...(!smtpConfigured && env.NODE_ENV !== "production"
        ? { debugCode: otpCode }
        : {}),
    };
  }

  async verifyResetCode(email: string, code: string) {
    const normalized = normalizeEmailForAuth(email);
    const purpose = "PASSWORD_RESET" as const;

    const row = await this.otpCodeRepository.findLatestActiveForEmail(
      normalized,
      purpose
    );

    if (!row) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "No active reset code found",
        statusCode: 400,
      });
    }

    if (row.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Too many attempts",
        statusCode: 403,
      });
    }

    const codeHash = sha256(
      `${normalized}:${purpose}:${code}:${env.OTP_PEPPER}`
    );

    if (codeHash !== row.codeHash) {
      await this.otpCodeRepository.incrementAttempts(row.id);
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid reset code",
        statusCode: 401,
      });
    }

    await this.otpCodeRepository.consume(row.id);
    const resetToken = await signOtpProofToken(normalized, purpose);

    return {
      resetToken,
      expiresInMinutes: env.OTP_TTL_MINUTES,
    };
  }

  async resetPassword(email: string, resetToken: string, newPassword: string) {
    const normalized = normalizeEmailForAuth(email);
    const proof = await verifyOtpProofToken(resetToken);

    if (proof.purpose !== "PASSWORD_RESET" || proof.sub !== normalized) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid password reset token",
        statusCode: 401,
      });
    }

    const user = await this.userRepository.findByEmail(normalized);

    if (!user) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "User not found",
        statusCode: 404,
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await this.userRepository.updatePasswordHash(user.id, passwordHash);

    return { success: true };
  }
}
