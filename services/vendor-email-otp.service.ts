import { env } from "@/config/env";
import { signOtpProofToken } from "@/lib/auth/otp-proof";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import { buildVendorSignupOtpEmailHtml } from "@/lib/mail/vendor-signup-otp-email-html";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { generateOtpCode, sha256 } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { OtpCodeRepository } from "@/repositories/otp-code.repository";
import { UserRepository } from "@/repositories/user.repository";

export class VendorEmailOtpService {
  constructor(
    private readonly otpCodeRepository = new OtpCodeRepository(),
    private readonly userRepository = new UserRepository()
  ) {}

  async sendCode(email: string) {
    const normalized = normalizeEmailForAuth(email);

    const existingEmail = await this.userRepository.findByEmail(normalized);
    if (existingEmail) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "Email is already in use",
        statusCode: 409,
      });
    }
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
    const purpose = "VENDOR_SIGNUP" as const;
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
      const minutes = env.OTP_TTL_MINUTES;
      await sendTransactionalEmail({
        to: normalized,
        subject: `${env.APP_NAME} — vendor verification code`,
        text: `Your verification code is: ${otpCode}\n\nIt expires in ${minutes} minutes. If you did not request this, ignore this email.`,
        html: buildVendorSignupOtpEmailHtml({
          code: otpCode,
          minutes,
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
      email: normalized,
      purpose,
      expiresAt: expiresAt.toISOString(),
      ...(!smtpConfigured && env.NODE_ENV !== "production" ? { debugCode: otpCode } : {}),
    };
  }

  async verifyCode(email: string, code: string) {
    const normalized = normalizeEmailForAuth(email);
    const purpose = "VENDOR_SIGNUP" as const;

    const row = await this.otpCodeRepository.findLatestActiveForEmail(
      normalized,
      purpose
    );

    if (!row) {
      const latest = await this.otpCodeRepository.findLatestForEmail(
        normalized,
        purpose
      );
      const now = new Date();
      if (latest?.consumedAt) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message:
            "That verification code was already used. Use \"Resend code\" to get a new one.",
          statusCode: 400,
        });
      }
      if (latest && latest.expiresAt <= now) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message:
            "That verification code has expired. Use \"Resend code\" to get a new one.",
          statusCode: 400,
        });
      }
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message:
          "No active verification code for this email. Send a new code, or use the same email you entered when requesting the code.",
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
        message: "Invalid verification code",
        statusCode: 401,
      });
    }

    await this.otpCodeRepository.consume(row.id);

    const verificationToken = await signOtpProofToken(normalized, purpose);

    return {
      email: normalized,
      purpose,
      verificationToken,
    };
  }
}
