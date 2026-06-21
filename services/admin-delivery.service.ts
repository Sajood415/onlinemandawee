import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
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
      perKmRateAmount?: number;
      freeAboveAmount?: number;
      etaMinDays: number;
      etaMaxDays: number;
      isActive?: boolean;
    },
    auth: AuthenticatedUser
  ) {
    await this.ensureVendorRuleTarget(input.vendorProfileId);
    await this.ensureNoDuplicateActiveGlobalStandardRule({
      method: input.method,
      scope: input.scope,
      isActive: input.isActive ?? true,
    });
    const rule = await this.deliveryRuleRepository.create(input);

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
    await this.ensureNoDuplicateActiveGlobalStandardRule({
      method: input.method,
      scope: input.scope,
      isActive: input.isActive ?? true,
      excludeRuleId: ruleId,
    });
    const rule = await this.deliveryRuleRepository.update({
      id: ruleId,
      ...input,
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

  private async ensureNoDuplicateActiveGlobalStandardRule(input: {
    method: "PICKUP" | "EXPRESS" | "STANDARD";
    scope: "GLOBAL" | "COUNTRY" | "VENDOR";
    isActive: boolean;
    excludeRuleId?: string;
  }) {
    if (!(input.method === "STANDARD" && input.scope === "GLOBAL" && input.isActive)) {
      return;
    }

    const duplicate = await this.deliveryRuleRepository.findFirstActiveByMethodAndScope({
      method: "STANDARD",
      scope: "GLOBAL",
      excludeId: input.excludeRuleId,
    });

    if (duplicate) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "An active global STANDARD rule already exists",
        statusCode: 409,
      });
    }
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
