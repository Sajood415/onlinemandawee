import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { UserRepository } from "@/repositories/user.repository";
import { ForgotPasswordService } from "@/services/forgot-password.service";

import type { z } from "zod";
import type {
  changeCustomerPasswordSchema,
  updateCustomerProfileSchema,
} from "@/validators/customer.validator";

type UpdateProfileInput = z.infer<typeof updateCustomerProfileSchema>;
type ChangePasswordInput = z.infer<typeof changeCustomerPasswordSchema>;

export class CustomerProfileService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly forgotPasswordService = new ForgotPasswordService()
  ) {}

  async getProfile(auth: AuthenticatedUser) {
    this.assertActiveCustomer(auth);
    const user = await this.userRepository.findById(auth.id);

    if (!user) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "User not found",
        statusCode: 404,
      });
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(auth: AuthenticatedUser, input: UpdateProfileInput) {
    this.assertActiveCustomer(auth);

    const existingPhone = await this.userRepository.findByPhone(input.phone);
    if (existingPhone && existingPhone.id !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "Phone is already in use",
        statusCode: 409,
      });
    }

    const user = await this.userRepository.updateProfile(auth.id, {
      fullName: input.fullName,
      phone: input.phone,
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async changePassword(auth: AuthenticatedUser, input: ChangePasswordInput) {
    this.assertActiveCustomer(auth);

    const user = await this.userRepository.findById(auth.id);
    if (!user) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "User not found",
        statusCode: 404,
      });
    }

    if (!user.passwordHash?.trim()) {
      throw new AppError({
        code: ERROR_CODE.VALIDATION_ERROR,
        message:
          "No password is set on this account. Use reset via email to set a password.",
        statusCode: 400,
      });
    }

    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError({
        code: ERROR_CODE.VALIDATION_ERROR,
        message: "Current password is incorrect",
        statusCode: 400,
      });
    }

    const passwordHash = await hashPassword(input.newPassword);
    await this.userRepository.updatePasswordHash(user.id, passwordHash);

    return { success: true };
  }

  async requestPasswordResetEmail(auth: AuthenticatedUser) {
    this.assertActiveCustomer(auth);
    return this.forgotPasswordService.requestReset(
      normalizeEmailForAuth(auth.email)
    );
  }

  async verifyPasswordResetCode(auth: AuthenticatedUser, code: string) {
    this.assertActiveCustomer(auth);
    return this.forgotPasswordService.verifyResetCode(
      normalizeEmailForAuth(auth.email),
      code
    );
  }

  async resetPasswordWithToken(
    auth: AuthenticatedUser,
    input: { resetToken: string; newPassword: string }
  ) {
    this.assertActiveCustomer(auth);
    return this.forgotPasswordService.resetPassword(
      normalizeEmailForAuth(auth.email),
      input.resetToken,
      input.newPassword
    );
  }

  private assertActiveCustomer(auth: AuthenticatedUser) {
    if (auth.role !== "CUSTOMER") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only customers can manage profile",
        statusCode: 403,
      });
    }

    if (auth.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Customer account is not active",
        statusCode: 403,
      });
    }
  }
}
