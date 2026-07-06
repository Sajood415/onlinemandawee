import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_TRANSACTION_FEE_AMOUNT_MINOR,
  PLATFORM_SETTINGS_ID,
} from "@/lib/platform/transaction-fee";
import {
  DEFAULT_AVAILABLE_CURRENCIES,
  DEFAULT_AVAILABLE_LOCALES,
} from "@/lib/platform/storefront-options";
import { FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR } from "@/lib/platform/transaction-fee";

type PlatformSettingsRecord = {
  id: string;
  transactionFeeAmountMinor: number;
  availableLocales: string[];
  availableCurrencies: string[];
  warehouseAddressLine1: string | null;
  warehouseCity: string | null;
  warehouseCountry: string | null;
  warehousePostalCode: string | null;
  updatedAt: Date;
  updatedByUserId: string | null;
};

function defaultPlatformSettings(): PlatformSettingsRecord {
  return {
    id: PLATFORM_SETTINGS_ID,
    transactionFeeAmountMinor: DEFAULT_TRANSACTION_FEE_AMOUNT_MINOR,
    availableLocales: [...DEFAULT_AVAILABLE_LOCALES],
    availableCurrencies: [...DEFAULT_AVAILABLE_CURRENCIES],
    warehouseAddressLine1: null,
    warehouseCity: null,
    warehouseCountry: null,
    warehousePostalCode: null,
    updatedAt: new Date(),
    updatedByUserId: null,
  };
}

function normalizeRecord(
  record: Partial<PlatformSettingsRecord> & { id: string }
): PlatformSettingsRecord {
  return {
    id: record.id,
    transactionFeeAmountMinor: FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR,
    availableLocales:
      record.availableLocales && record.availableLocales.length > 0
        ? record.availableLocales
        : [...DEFAULT_AVAILABLE_LOCALES],
    availableCurrencies:
      record.availableCurrencies && record.availableCurrencies.length > 0
        ? record.availableCurrencies
        : [...DEFAULT_AVAILABLE_CURRENCIES],
    warehouseAddressLine1: record.warehouseAddressLine1 ?? null,
    warehouseCity: record.warehouseCity ?? null,
    warehouseCountry: record.warehouseCountry ?? null,
    warehousePostalCode: record.warehousePostalCode ?? null,
    updatedAt: record.updatedAt ?? new Date(),
    updatedByUserId: record.updatedByUserId ?? null,
  };
}

export class PlatformSettingsRepository {
  async getOrCreate(): Promise<PlatformSettingsRecord> {
    if (!("platformSettings" in prisma) || !prisma.platformSettings) {
      return defaultPlatformSettings();
    }

    const record = await prisma.platformSettings.upsert({
      where: { id: PLATFORM_SETTINGS_ID },
      create: {
        id: PLATFORM_SETTINGS_ID,
        transactionFeeAmountMinor: DEFAULT_TRANSACTION_FEE_AMOUNT_MINOR,
        availableLocales: [...DEFAULT_AVAILABLE_LOCALES],
        availableCurrencies: [...DEFAULT_AVAILABLE_CURRENCIES],
      },
      update: {},
    });

    return normalizeRecord(record);
  }

  async update(input: {
    transactionFeeAmountMinor?: number;
    availableLocales?: string[];
    availableCurrencies?: string[];
    warehouseAddressLine1?: string | null;
    warehouseCity?: string | null;
    warehouseCountry?: string | null;
    warehousePostalCode?: string | null;
    updatedByUserId?: string;
  }): Promise<PlatformSettingsRecord> {
    const current = defaultPlatformSettings();

    if (!("platformSettings" in prisma) || !prisma.platformSettings) {
      return {
        ...current,
        ...(input.availableLocales !== undefined
          ? { availableLocales: input.availableLocales }
          : {}),
        ...(input.availableCurrencies !== undefined
          ? { availableCurrencies: input.availableCurrencies }
          : {}),
        ...(input.warehouseAddressLine1 !== undefined
          ? { warehouseAddressLine1: input.warehouseAddressLine1 }
          : {}),
        ...(input.warehouseCity !== undefined ? { warehouseCity: input.warehouseCity } : {}),
        ...(input.warehouseCountry !== undefined
          ? { warehouseCountry: input.warehouseCountry }
          : {}),
        ...(input.warehousePostalCode !== undefined
          ? { warehousePostalCode: input.warehousePostalCode }
          : {}),
        updatedByUserId: input.updatedByUserId ?? null,
      };
    }

    const record = await prisma.platformSettings.upsert({
      where: { id: PLATFORM_SETTINGS_ID },
      create: {
        id: PLATFORM_SETTINGS_ID,
        transactionFeeAmountMinor: FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR,
        availableLocales: input.availableLocales ?? [...DEFAULT_AVAILABLE_LOCALES],
        availableCurrencies:
          input.availableCurrencies ?? [...DEFAULT_AVAILABLE_CURRENCIES],
        warehouseAddressLine1: input.warehouseAddressLine1 ?? null,
        warehouseCity: input.warehouseCity ?? null,
        warehouseCountry: input.warehouseCountry ?? null,
        warehousePostalCode: input.warehousePostalCode ?? null,
        updatedByUserId: input.updatedByUserId ?? null,
      },
      update: {
        ...(input.availableLocales !== undefined
          ? { availableLocales: input.availableLocales }
          : {}),
        ...(input.availableCurrencies !== undefined
          ? { availableCurrencies: input.availableCurrencies }
          : {}),
        ...(input.warehouseAddressLine1 !== undefined
          ? { warehouseAddressLine1: input.warehouseAddressLine1 }
          : {}),
        ...(input.warehouseCity !== undefined ? { warehouseCity: input.warehouseCity } : {}),
        ...(input.warehouseCountry !== undefined
          ? { warehouseCountry: input.warehouseCountry }
          : {}),
        ...(input.warehousePostalCode !== undefined
          ? { warehousePostalCode: input.warehousePostalCode }
          : {}),
        updatedByUserId: input.updatedByUserId ?? null,
      },
    });

    return normalizeRecord(record);
  }
}
