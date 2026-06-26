import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR,
  formatFlatTransactionFeeLabel,
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
    return {
      id: settings.id,
      transactionFeeAmountMinor: FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR,
      transactionFeeLabel: formatFlatTransactionFeeLabel(
        FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR
      ),
      transactionFeeIsFixed: true,
      availableLocales: normalizeAvailableLocales(settings.availableLocales),
      availableCurrencies: normalizeAvailableCurrencies(
        settings.availableCurrencies
      ),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
