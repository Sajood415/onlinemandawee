import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { BusinessType, IndustryType } from "@/domain/vendor/vendor-types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { slugify } from "@/lib/utils/slug";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { VendorAddressRepository } from "@/repositories/vendor-address.repository";
import { VendorPayoutMethodRepository } from "@/repositories/vendor-payout-method.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

type UpdateBusinessInfoInput = {
  storeName: string;
  businessType: BusinessType;
  industryType?: IndustryType;
  logoUrl?: string;
  description?: string;
};

type UpdatePayoutInput = {
  method: "BANK";
  accountName: string;
  accountNumberOrIban: string;
  bankName: string;
};

type UpdateAddressInput = {
  addressLine1: string;
  city: string;
  country: string;
  postalCode: string;
};

/** PATCH body omits unchanged sections; keep DB values instead of writing null. */
function mergeTrimmedPayoutField(
  incoming: string | undefined,
  previous: string | null | undefined
): string | null {
  if (incoming !== undefined) {
    const t = incoming.trim();
    return t === "" ? null : t;
  }
  return previous ?? null;
}

export class VendorProfileService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly vendorAddressRepository = new VendorAddressRepository(),
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
      industryType: vendor.industryType ?? null,
      sellerType: vendor.sellerType,
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
            method: "BANK" as const,
            accountName: vendor.payoutMethod.accountName ?? "",
            accountNumberOrIban: vendor.payoutMethod.accountNumberOrIban ?? "",
            bankName: vendor.payoutMethod.bankName ?? "",
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
      industryType: input.industryType,
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
      industryType: updated.industryType ?? null,
      logoUrl: updated.logoUrl ?? "",
      description: updated.description ?? "",
    };
  }

  async updateAddress(auth: AuthenticatedUser, input: UpdateAddressInput) {
    const vendor = await this.requireActiveVendor(auth.id);

    const address = await this.vendorAddressRepository.upsert({
      vendorProfileId: vendor.id,
      addressLine1: input.addressLine1,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.address_updated",
      entityType: "VendorProfile",
      entityId: vendor.id,
    });

    return {
      addressLine1: address.addressLine1,
      city: address.city,
      country: address.country,
      postalCode: address.postalCode,
    };
  }

  async updatePayoutMethod(auth: AuthenticatedUser, input: UpdatePayoutInput) {
    const vendor = await this.requireActiveVendor(auth.id);
    const existing = vendor.payoutMethod;

    const accountName = mergeTrimmedPayoutField(input.accountName, existing?.accountName);
    const accountNumberOrIban = mergeTrimmedPayoutField(
      input.accountNumberOrIban,
      existing?.accountNumberOrIban
    );
    const bankName = mergeTrimmedPayoutField(input.bankName, existing?.bankName);

    await this.vendorPayoutMethodRepository.upsert({
      vendorProfileId: vendor.id,
      method: "BANK",
      accountName,
      accountNumberOrIban,
      bankName,
      stripeEmail: null,
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
