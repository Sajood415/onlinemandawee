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
