import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { BusinessType, PayoutMethodType } from "@/domain/vendor/vendor-types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { slugify } from "@/lib/utils/slug";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { VendorPayoutMethodRepository } from "@/repositories/vendor-payout-method.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

type UpdateBusinessInfoInput = {
  storeName: string;
  businessType: BusinessType;
  logoUrl?: string;
  description?: string;
};

type UpdatePayoutInput = {
  method: PayoutMethodType;
  accountName?: string;
  accountNumberOrIban?: string;
  bankName?: string;
  stripeEmail?: string;
};

export class VendorProfileService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly vendorPayoutMethodRepository = new VendorPayoutMethodRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async getProfile(auth: AuthenticatedUser) {
    const vendor = await this.requireActiveVendor(auth.id);

    return {
      id: vendor.id,
      storeName: vendor.storeName ?? "",
      storeSlug: vendor.storeSlug ?? "",
      businessType: vendor.businessType,
      logoUrl: vendor.logoUrl ?? "",
      description: vendor.description ?? "",
      status: vendor.status,
      user: {
        id: vendor.user.id,
        fullName: vendor.user.fullName,
        email: vendor.user.email,
        phone: vendor.user.phone,
      },
      address: vendor.address
        ? {
            addressLine1: vendor.address.addressLine1,
            city: vendor.address.city,
            country: vendor.address.country,
            postalCode: vendor.address.postalCode,
          }
        : null,
      payoutMethod: vendor.payoutMethod
        ? {
            method: vendor.payoutMethod.method,
            accountName: vendor.payoutMethod.accountName ?? "",
            accountNumberOrIban: vendor.payoutMethod.accountNumberOrIban ?? "",
            bankName: vendor.payoutMethod.bankName ?? "",
            stripeEmail: vendor.payoutMethod.stripeEmail ?? "",
          }
        : null,
    };
  }

  async updateBusinessInfo(auth: AuthenticatedUser, input: UpdateBusinessInfoInput) {
    const vendor = await this.requireActiveVendor(auth.id);
    const storeSlug = await this.buildUniqueStoreSlug(input.storeName, vendor.id);

    const updated = await this.vendorProfileRepository.updateStoreInformation({
      vendorProfileId: vendor.id,
      storeName: input.storeName,
      storeSlug,
      businessType: input.businessType,
      logoUrl: input.logoUrl ?? vendor.logoUrl ?? undefined,
      description: input.description,
      onboardingStep: vendor.onboardingStep,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.profile_updated",
      entityType: "VendorProfile",
      entityId: vendor.id,
    });

    return {
      storeName: updated.storeName,
      storeSlug: updated.storeSlug,
      businessType: updated.businessType,
      logoUrl: updated.logoUrl ?? "",
      description: updated.description ?? "",
    };
  }

  async updatePayoutMethod(auth: AuthenticatedUser, input: UpdatePayoutInput) {
    const vendor = await this.requireActiveVendor(auth.id);

    await this.vendorPayoutMethodRepository.upsert({
      vendorProfileId: vendor.id,
      method: input.method,
      accountName: input.accountName,
      accountNumberOrIban: input.accountNumberOrIban,
      bankName: input.bankName,
      stripeEmail: input.stripeEmail,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.payout_method_updated",
      entityType: "VendorProfile",
      entityId: vendor.id,
    });

    return { success: true };
  }

  private async requireActiveVendor(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);
    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }
    if (vendor.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active vendors can manage their profile",
        statusCode: 403,
      });
    }
    return vendor;
  }

  private async buildUniqueStoreSlug(storeName: string, vendorProfileId: string) {
    const baseSlug = slugify(storeName);
    if (!baseSlug) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Invalid store name",
        statusCode: 400,
      });
    }
    const existing = await this.vendorProfileRepository.findByStoreSlug(baseSlug);
    if (!existing || existing.id === vendorProfileId) {
      return baseSlug;
    }
    return `${baseSlug}-${vendorProfileId.slice(-6).toLowerCase()}`;
  }
}
