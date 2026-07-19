import { env } from "@/config/env.shared";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { DeliveryRuleRepository } from "@/repositories/delivery-rule.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

const DEFAULT_ETA_MIN_DAYS = 1;
const DEFAULT_ETA_MAX_DAYS = 3;

export class VendorExpressDeliveryService {
  constructor(
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly deliveryRuleRepository = new DeliveryRuleRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async getExpressFee(auth: AuthenticatedUser) {
    const vendor = await this.requireThirdPartyVendor(auth.id);
    const rule = await this.deliveryRuleRepository.findVendorMethodRule({
      vendorProfileId: vendor.id,
      method: "EXPRESS",
    });

    return {
      sellerType: vendor.sellerType,
      canSetExpressFee: true as const,
      feeAmountMinor: rule?.baseFeeAmount ?? null,
      isActive: rule?.isActive ?? false,
      hasRule: rule != null,
      etaMinDays: rule?.etaMinDays ?? DEFAULT_ETA_MIN_DAYS,
      etaMaxDays: rule?.etaMaxDays ?? DEFAULT_ETA_MAX_DAYS,
    };
  }

  async setExpressFee(
    auth: AuthenticatedUser,
    input: { feeAmountMinor: number; isActive?: boolean }
  ) {
    const vendor = await this.requireThirdPartyVendor(auth.id);

    if (!Number.isInteger(input.feeAmountMinor) || input.feeAmountMinor < 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Express fee must be zero or greater.",
        statusCode: 400,
      });
    }

    if (input.feeAmountMinor > 500_00) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Express fee cannot be more than $500.",
        statusCode: 400,
      });
    }

    const existing = await this.deliveryRuleRepository.findVendorMethodRule({
      vendorProfileId: vendor.id,
      method: "EXPRESS",
    });

    const isActive = input.isActive ?? true;

    const rule = existing
      ? await this.deliveryRuleRepository.update({
          id: existing.id,
          method: "EXPRESS",
          scope: "VENDOR",
          vendorProfileId: vendor.id,
          priceModel: "FLAT",
          baseFeeAmount: input.feeAmountMinor,
          transactionFeeAmountMinor: null,
          commissionRateBps: env.COMMISSION_RATE_BPS,
          perKmRateAmount: undefined,
          freeAboveAmount: undefined,
          etaMinDays: existing.etaMinDays || DEFAULT_ETA_MIN_DAYS,
          etaMaxDays: existing.etaMaxDays || DEFAULT_ETA_MAX_DAYS,
          isActive,
        })
      : await this.deliveryRuleRepository.create({
          method: "EXPRESS",
          scope: "VENDOR",
          vendorProfileId: vendor.id,
          priceModel: "FLAT",
          baseFeeAmount: input.feeAmountMinor,
          transactionFeeAmountMinor: null,
          commissionRateBps: env.COMMISSION_RATE_BPS,
          etaMinDays: DEFAULT_ETA_MIN_DAYS,
          etaMaxDays: DEFAULT_ETA_MAX_DAYS,
          isActive,
        });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: existing
        ? "vendor.express_delivery_fee_updated"
        : "vendor.express_delivery_fee_created",
      entityType: "DeliveryRule",
      entityId: rule.id,
    });

    return {
      sellerType: vendor.sellerType,
      canSetExpressFee: true as const,
      feeAmountMinor: rule.baseFeeAmount,
      isActive: rule.isActive,
      hasRule: true,
      etaMinDays: rule.etaMinDays,
      etaMaxDays: rule.etaMaxDays,
    };
  }

  private async requireThirdPartyVendor(userId: string) {
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
        message: "Only active vendors can manage Express delivery.",
        statusCode: 403,
      });
    }
    if (vendor.sellerType === "PLATFORM") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message:
          "Mandawee shop delivery uses warehouse distance pricing, not a shop Express fee.",
        statusCode: 403,
      });
    }
    return vendor;
  }
}
