import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  HAWALA_API_RATE_MINUS_PERCENT,
  HAWALA_API_SYNC_TTL_MS,
  HAWALA_CURRENCIES,
  type HawalaCurrency,
} from "@/lib/hawala/constants";
import { fetchHawalaRatesFromApi } from "@/lib/hawala/fetch-api-rates";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import {
  HawalaExchangeRateRepository,
  type HawalaExchangeRateRecord,
} from "@/repositories/hawala-exchange-rate.repository";

function serializeRate(rate: HawalaExchangeRateRecord) {
  return {
    ...rate,
    apiSyncedAt: rate.apiSyncedAt?.toISOString() ?? null,
    createdAt: rate.createdAt.toISOString(),
    updatedAt: rate.updatedAt.toISOString(),
  };
}

export class HawalaExchangeRateService {
  constructor(
    private readonly hawalaExchangeRateRepository = new HawalaExchangeRateRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async list() {
    const rates = await this.ensureFreshRates();
    return rates.map(serializeRate);
  }

  async getRatesToAfnMap(): Promise<Record<string, number>> {
    const rates = await this.ensureFreshRates();
    return Object.fromEntries(rates.map((rate) => [rate.currency, rate.rateToAfn]));
  }

  async syncFromApi(
    auth: AuthenticatedUser,
    input?: { overwriteManual?: boolean }
  ) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can sync exchange rates",
        statusCode: 403,
      });
    }

    const rates = await this.pullAndStoreApiRates({
      overwriteManual: input?.overwriteManual ?? false,
      force: true,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "hawala.exchange_rates_synced",
      entityType: "HawalaExchangeRate",
      metadata: {
        overwriteManual: Boolean(input?.overwriteManual),
        apiRateMinusPercent: HAWALA_API_RATE_MINUS_PERCENT,
      },
    });

    return rates.map(serializeRate);
  }

  async updateMany(
    auth: AuthenticatedUser,
    input: { rates: Array<{ currency: HawalaCurrency; rateToAfn: number }> }
  ) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only admins can update exchange rates",
        statusCode: 403,
      });
    }

    const updated = await this.hawalaExchangeRateRepository.upsertMany(
      input.rates,
      auth.id
    );

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "hawala.exchange_rates_updated",
      entityType: "HawalaExchangeRate",
      metadata: { rates: input.rates, manualOverride: true },
    });

    return updated.map(serializeRate);
  }

  private async ensureFreshRates() {
    await this.hawalaExchangeRateRepository.ensureRowsExist();
    try {
      return await this.pullAndStoreApiRates({ force: false, overwriteManual: false });
    } catch {
      return this.hawalaExchangeRateRepository.listAll();
    }
  }

  private async pullAndStoreApiRates(options: {
    force: boolean;
    overwriteManual: boolean;
  }) {
    const existing = await this.hawalaExchangeRateRepository.ensureRowsExist();

    if (!options.force && !this.needsApiSync(existing)) {
      return existing;
    }

    const fetched = await fetchHawalaRatesFromApi();
    const syncedAt = new Date();

    return this.hawalaExchangeRateRepository.applyApiRates(
      HAWALA_CURRENCIES.map((currency) => ({
        currency,
        rateToAfn: fetched.displayRatesToAfn[currency],
        apiRateToAfn: fetched.apiRatesToAfn[currency],
      })),
      {
        overwriteManual: options.overwriteManual,
        syncedAt,
      }
    );
  }

  private needsApiSync(rates: HawalaExchangeRateRecord[]) {
    const autoRates = rates.filter(
      (rate) => rate.currency === "AFN" || !rate.isManualOverride
    );
    if (autoRates.length === 0) return false;

    const now = Date.now();
    return autoRates.some((rate) => {
      if (!rate.apiSyncedAt) return true;
      return now - rate.apiSyncedAt.getTime() > HAWALA_API_SYNC_TTL_MS;
    });
  }
}
