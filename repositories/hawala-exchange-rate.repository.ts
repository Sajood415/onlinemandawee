import { prisma } from "@/lib/db/prisma";
import {
  HAWALA_CURRENCIES,
  HAWALA_DEFAULT_RATES_TO_AFN,
  type HawalaCurrency,
} from "@/lib/hawala/constants";

const rateSelect = {
  id: true,
  currency: true,
  rateToAfn: true,
  apiRateToAfn: true,
  isManualOverride: true,
  isActive: true,
  apiSyncedAt: true,
  createdAt: true,
  updatedAt: true,
  updatedByUserId: true,
} as const;

export class HawalaExchangeRateRepository {
  async listAll() {
    return prisma.hawalaExchangeRate.findMany({
      select: rateSelect,
      orderBy: { currency: "asc" },
    });
  }

  async ensureRowsExist() {
    const existing = await this.listAll();
    const existingCurrencies = new Set(existing.map((rate) => rate.currency));
    const missing = HAWALA_CURRENCIES.filter(
      (currency) => !existingCurrencies.has(currency)
    );

    if (missing.length === 0) return existing;

    await Promise.all(
      missing.map((currency) =>
        prisma.hawalaExchangeRate.create({
          data: {
            currency,
            rateToAfn: HAWALA_DEFAULT_RATES_TO_AFN[currency],
            apiRateToAfn: currency === "AFN" ? 1 : null,
            isManualOverride: false,
          },
        })
      )
    );

    return this.listAll();
  }

  /** @deprecated use ensureRowsExist + service sync */
  async ensureSeeded() {
    return this.ensureRowsExist();
  }

  async applyApiRates(
    rates: Array<{
      currency: HawalaCurrency;
      rateToAfn: number;
      apiRateToAfn: number;
    }>,
    options?: { overwriteManual?: boolean; syncedAt?: Date }
  ) {
    const syncedAt = options?.syncedAt ?? new Date();
    const overwriteManual = options?.overwriteManual ?? false;
    const existing = await this.ensureRowsExist();
    const byCurrency = new Map(existing.map((row) => [row.currency, row]));

    await Promise.all(
      rates.map(async (rate) => {
        const current = byCurrency.get(rate.currency);
        const keepManual =
          !overwriteManual &&
          Boolean(current?.isManualOverride === true) &&
          rate.currency !== "AFN";

        await prisma.hawalaExchangeRate.upsert({
          where: { currency: rate.currency },
          create: {
            currency: rate.currency,
            rateToAfn: rate.currency === "AFN" ? 1 : rate.rateToAfn,
            apiRateToAfn: rate.currency === "AFN" ? 1 : rate.apiRateToAfn,
            isManualOverride: false,
            apiSyncedAt: syncedAt,
          },
          update: {
            apiRateToAfn: rate.currency === "AFN" ? 1 : rate.apiRateToAfn,
            apiSyncedAt: syncedAt,
            ...(keepManual || rate.currency === "AFN"
              ? rate.currency === "AFN"
                ? { rateToAfn: 1, isManualOverride: false }
                : {}
              : {
                  rateToAfn: rate.rateToAfn,
                  isManualOverride: false,
                }),
          },
        });
      })
    );

    return this.listAll();
  }

  async upsertMany(
    rates: Array<{ currency: HawalaCurrency; rateToAfn: number }>,
    updatedByUserId: string
  ) {
    await Promise.all(
      rates.map((rate) =>
        prisma.hawalaExchangeRate.upsert({
          where: { currency: rate.currency },
          create: {
            currency: rate.currency,
            rateToAfn: rate.currency === "AFN" ? 1 : rate.rateToAfn,
            apiRateToAfn: rate.currency === "AFN" ? 1 : null,
            isManualOverride: rate.currency !== "AFN",
            updatedByUserId,
          },
          update: {
            rateToAfn: rate.currency === "AFN" ? 1 : rate.rateToAfn,
            isManualOverride: rate.currency !== "AFN",
            updatedByUserId,
          },
        })
      )
    );

    return this.listAll();
  }

  async clearManualOverrides(currencies?: HawalaCurrency[]) {
    const where =
      currencies && currencies.length > 0
        ? { currency: { in: currencies } }
        : { currency: { not: "AFN" } };

    await prisma.hawalaExchangeRate.updateMany({
      where,
      data: { isManualOverride: false },
    });

    return this.listAll();
  }
}

export type HawalaExchangeRateRecord = Awaited<
  ReturnType<HawalaExchangeRateRepository["listAll"]>
>[number];
