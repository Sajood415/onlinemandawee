import { env } from "@/config/env.shared";
import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { formatMembershipFee } from "@/lib/membership/subscription-policy";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  formatCommissionRateLabel,
  formatCommissionRatePercent,
} from "@/lib/platform/transaction-fee";
import {
  normalizeAvailableCurrencies,
  normalizeAvailableLocales,
} from "@/lib/platform/storefront-options";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { PlatformSettingsRepository } from "@/repositories/platform-settings.repository";

type UpdatePlatformSettingsInput = {
  transactionFeeAmountMinor?: number;
  availableLocales?: string[];
  availableCurrencies?: string[];
  warehouseAddressLine1?: string | null;
  warehouseCity?: string | null;
  warehouseCountry?: string | null;
  warehousePostalCode?: string | null;
};

export class PlatformSettingsService {
  constructor(
    private readonly platformSettingsRepository = new PlatformSettingsRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async get() {
    const settings = await this.platformSettingsRepository.getOrCreate();
    return this.serialize(settings);
  }

  async update(auth: AuthenticatedUser, input: UpdatePlatformSettingsInput) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can update platform settings",
        statusCode: 403,
      });
    }

    const { transactionFeeAmountMinor: _ignored, ...mutableInput } = input;

    const updated = await this.platformSettingsRepository.update({
      ...mutableInput,
      updatedByUserId: auth.id,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "platform.settings_updated",
      entityType: "PlatformSettings",
      entityId: updated.id,
      metadata: {
        availableLocales: updated.availableLocales,
        availableCurrencies: updated.availableCurrencies,
      },
    });

    return this.serialize(updated);
  }

  private serialize(
    settings: Awaited<ReturnType<PlatformSettingsRepository["getOrCreate"]>>
  ) {
    const commissionRateBps = env.COMMISSION_RATE_BPS;

    return {
      id: settings.id,
      commissionRateBps,
      commissionRatePercent: formatCommissionRatePercent(commissionRateBps),
      /** @deprecated Flat-fee cents field — commission is percentage-based. */
      transactionFeeAmountMinor: 0,
      transactionFeeLabel: formatCommissionRateLabel(commissionRateBps),
      transactionFeeIsFixed: false,
      membershipFeeAmount: env.MEMBERSHIP_FEE_AMOUNT,
      membershipCurrency: env.MEMBERSHIP_INVOICE_CURRENCY,
      membershipTrialDays: env.MEMBERSHIP_TRIAL_DAYS,
      membershipFeeLabel: formatMembershipFee(
        env.MEMBERSHIP_FEE_AMOUNT,
        env.MEMBERSHIP_INVOICE_CURRENCY
      ),
      availableLocales: normalizeAvailableLocales(settings.availableLocales),
      availableCurrencies: normalizeAvailableCurrencies(
        settings.availableCurrencies
      ),
      warehouseAddressLine1: settings.warehouseAddressLine1,
      warehouseCity: settings.warehouseCity,
      warehouseCountry: settings.warehouseCountry,
      warehousePostalCode: settings.warehousePostalCode,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
