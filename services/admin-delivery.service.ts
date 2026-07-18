import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { env } from "@/config/env.shared";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { DeliveryRuleRepository } from "@/repositories/delivery-rule.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

export class AdminDeliveryService {
  constructor(
    private readonly deliveryRuleRepository = new DeliveryRuleRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async listRules() {
    const rules = await this.deliveryRuleRepository.listAll();
    return rules.map((rule) => this.serializeRule(rule));
  }

  async createRule(
    input: {
      method: "PICKUP" | "EXPRESS" | "STANDARD";
      scope: "GLOBAL" | "COUNTRY" | "VENDOR";
      vendorProfileId?: string;
      countryCode?: string;
      priceModel: "FLAT" | "PER_KM" | "FREE_ABOVE";
      baseFeeAmount: number;
      transactionFeeAmountMinor?: number;
      perKmRateAmount?: number;
      freeAboveAmount?: number;
      etaMinDays: number;
      etaMaxDays: number;
      isActive?: boolean;
    },
    auth: AuthenticatedUser
  ) {
    await this.ensureVendorRuleTarget(input.vendorProfileId);
    await this.ensureNoDuplicateActiveRule({
      method: input.method,
      scope: input.scope,
      vendorProfileId: input.vendorProfileId,
      countryCode: input.countryCode,
      isActive: input.isActive ?? true,
    });
    const rule = await this.deliveryRuleRepository.create(
      this.normalizeRuleInput(input)
    );

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.delivery_rule_created",
      entityType: "DeliveryRule",
      entityId: rule.id,
      metadata: {
        method: rule.method,
        scope: rule.scope,
      },
    });

    return this.serializeRule(rule);
  }

  async updateRule(
    ruleId: string,
    input: {
      method: "PICKUP" | "EXPRESS" | "STANDARD";
      scope: "GLOBAL" | "COUNTRY" | "VENDOR";
      vendorProfileId?: string;
      countryCode?: string;
      priceModel: "FLAT" | "PER_KM" | "FREE_ABOVE";
      baseFeeAmount: number;
      transactionFeeAmountMinor?: number;
      perKmRateAmount?: number;
      freeAboveAmount?: number;
      etaMinDays: number;
      etaMaxDays: number;
      isActive?: boolean;
    },
    auth: AuthenticatedUser
  ) {
    const existing = await this.deliveryRuleRepository.findById(ruleId);

    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Delivery rule not found",
        statusCode: 404,
      });
    }

    await this.ensureVendorRuleTarget(input.vendorProfileId);
    await this.ensureNoDuplicateActiveRule({
      method: input.method,
      scope: input.scope,
      vendorProfileId: input.vendorProfileId,
      countryCode: input.countryCode,
      isActive: input.isActive ?? true,
      excludeRuleId: ruleId,
    });
    const rule = await this.deliveryRuleRepository.update({
      id: ruleId,
      ...this.normalizeRuleInput(input),
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.delivery_rule_updated",
      entityType: "DeliveryRule",
      entityId: rule.id,
      metadata: {
        method: rule.method,
        scope: rule.scope,
      },
    });

    return this.serializeRule(rule);
  }

  async deleteRule(ruleId: string, auth: AuthenticatedUser) {
    const existing = await this.deliveryRuleRepository.findById(ruleId);

    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Delivery rule not found",
        statusCode: 404,
      });
    }

    if (existing.isActive) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Active delivery rules cannot be deleted",
        statusCode: 400,
      });
    }

    const deleted = await this.deliveryRuleRepository.deleteById(ruleId);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.delivery_rule_deleted",
      entityType: "DeliveryRule",
      entityId: deleted.id,
      metadata: {
        method: existing.method,
        scope: existing.scope,
      },
    });

    return {
      id: deleted.id,
      deleted: true,
    };
  }

  /**
   * Wipes every delivery rule (active or inactive). Unlike deleteRule, this is
   * an explicit bulk reset the admin opts into, so it intentionally bypasses
   * the "active rules cannot be deleted" guard. Checkout will have no
   * matching delivery rules until new ones are created.
   */
  async deleteAllRules(auth: AuthenticatedUser) {
    const existingRules = await this.deliveryRuleRepository.listAll();
    const deletedCount = await this.deliveryRuleRepository.deleteAll();

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.delivery_rules_bulk_deleted",
      entityType: "DeliveryRule",
      entityId: "ALL",
      metadata: {
        deletedCount,
        ruleIds: existingRules.map((rule) => rule.id),
      },
    });

    return { deletedCount };
  }

  private async ensureVendorRuleTarget(vendorProfileId?: string) {
    if (!vendorProfileId) {
      return;
    }

    const vendor = await this.vendorProfileRepository.findById(vendorProfileId);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }
  }

  /**
   * Only one active rule may exist per (method, scope, target) combination,
   * so admins can never end up with two conflicting rules silently competing
   * for the same orders (e.g. two active GLOBAL EXPRESS rules, or two active
   * VENDOR rules for the same vendor + method).
   */
  private async ensureNoDuplicateActiveRule(input: {
    method: "PICKUP" | "EXPRESS" | "STANDARD";
    scope: "GLOBAL" | "COUNTRY" | "VENDOR";
    vendorProfileId?: string;
    countryCode?: string;
    isActive: boolean;
    excludeRuleId?: string;
  }) {
    if (!input.isActive) {
      return;
    }

    if (input.scope === "COUNTRY" && !input.countryCode) {
      return;
    }

    if (input.scope === "VENDOR" && !input.vendorProfileId) {
      return;
    }

    const duplicate = await this.deliveryRuleRepository.findFirstActiveByMethodAndScope({
      method: input.method,
      scope: input.scope,
      vendorProfileId: input.vendorProfileId,
      countryCode: input.countryCode,
      excludeId: input.excludeRuleId,
    });

    if (duplicate) {
      const target =
        input.scope === "VENDOR"
          ? "for this vendor "
          : input.scope === "COUNTRY"
            ? `for ${input.countryCode} `
            : "";
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: `An active ${input.scope.toLowerCase()} ${input.method} rule ${target}already exists. Deactivate or edit it instead of creating another one.`,
        statusCode: 409,
      });
    }
  }

  private normalizeRuleInput(input: {
    method: "PICKUP" | "EXPRESS" | "STANDARD";
    scope: "GLOBAL" | "COUNTRY" | "VENDOR";
    vendorProfileId?: string;
    countryCode?: string;
    priceModel: "FLAT" | "PER_KM" | "FREE_ABOVE";
    baseFeeAmount: number;
    transactionFeeAmountMinor?: number;
    perKmRateAmount?: number;
    freeAboveAmount?: number;
    etaMinDays: number;
    etaMaxDays: number;
    isActive?: boolean;
  }) {
    return {
      ...input,
      // Commission is percentage-based (COMMISSION_RATE_BPS), not stored per rule.
      transactionFeeAmountMinor: null,
      commissionRateBps: env.COMMISSION_RATE_BPS,
    };
  }

  private serializeRule(
    rule: Awaited<ReturnType<DeliveryRuleRepository["findById"]>> extends infer T
      ? NonNullable<T>
      : never
  ) {
    return {
      id: rule.id,
      method: rule.method,
      scope: rule.scope,
      vendorProfileId: rule.vendorProfileId,
      vendorStoreSlug: rule.vendorProfile?.storeSlug ?? null,
      vendorStoreName: rule.vendorProfile?.storeName ?? null,
      countryCode: rule.countryCode,
      priceModel: rule.priceModel,
      baseFeeAmount: rule.baseFeeAmount,
      transactionFeeAmountMinor: null,
      commissionRateBps: env.COMMISSION_RATE_BPS,
      perKmRateAmount: rule.perKmRateAmount,
      freeAboveAmount: rule.freeAboveAmount,
      etaMinDays: rule.etaMinDays,
      etaMaxDays: rule.etaMaxDays,
      isActive: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }
}
