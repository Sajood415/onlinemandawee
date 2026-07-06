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
  isActive: true,
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

  async ensureSeeded() {
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
          },
        })
      )
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
            updatedByUserId,
          },
          update: {
            rateToAfn: rate.currency === "AFN" ? 1 : rate.rateToAfn,
            updatedByUserId,
          },
        })
      )
    );

    return this.listAll();
  }
}

export type HawalaExchangeRateRecord = Awaited<
  ReturnType<HawalaExchangeRateRepository["listAll"]>
>[number];
