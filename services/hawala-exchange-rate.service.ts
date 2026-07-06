import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import type { HawalaCurrency } from "@/lib/hawala/constants";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import {
  HawalaExchangeRateRepository,
  type HawalaExchangeRateRecord,
} from "@/repositories/hawala-exchange-rate.repository";

function serializeRate(rate: HawalaExchangeRateRecord) {
  return {
    ...rate,
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
    const rates = await this.hawalaExchangeRateRepository.ensureSeeded();
    return rates.map(serializeRate);
  }

  async getRatesToAfnMap(): Promise<Record<string, number>> {
    const rates = await this.hawalaExchangeRateRepository.ensureSeeded();
    return Object.fromEntries(rates.map((rate) => [rate.currency, rate.rateToAfn]));
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
      metadata: { rates: input.rates },
    });

    return updated.map(serializeRate);
  }
}
