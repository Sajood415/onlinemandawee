import type { DeliveryMethod } from "@/domain/delivery/delivery-types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { DeliveryRuleRepository } from "@/repositories/delivery-rule.repository";

type DeliveryQuoteItem = {
  vendorProfileId: string;
  quantity: number;
  currentLineTotal: number;
};

type DeliveryQuoteVendorGroup = {
  vendorProfileId: string;
  subtotalCurrent: number;
};

export class DeliveryPricingService {
  constructor(
    private readonly deliveryRuleRepository = new DeliveryRuleRepository()
  ) {}

  async quote(input: {
    method: DeliveryMethod;
    countryCode?: string;
    currency: string;
    distanceKm?: number;
    items: DeliveryQuoteItem[];
    vendorGroups: DeliveryQuoteVendorGroup[];
  }) {
    const activeRules = await this.deliveryRuleRepository.listActiveByMethod(
      input.method
    );

    if (activeRules.length === 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: `No active delivery rules configured for ${input.method}`,
        statusCode: 400,
      });
    }

    const subtotalCurrent = input.items.reduce(
      (sum, item) => sum + item.currentLineTotal,
      0
    );

    if (input.method === "EXPRESS") {
      const vendorGroups = input.vendorGroups.map((vendorGroup) => {
        const rule = this.pickBestRule(activeRules, {
          vendorProfileId: vendorGroup.vendorProfileId,
          countryCode: input.countryCode,
        });

        return {
          vendorProfileId: vendorGroup.vendorProfileId,
          amount: this.calculateAmount(rule, {
            subtotalAmount: vendorGroup.subtotalCurrent,
            distanceKm: input.distanceKm,
          }),
          etaMinDays: rule.etaMinDays,
          etaMaxDays: rule.etaMaxDays,
          ruleId: rule.id,
          scope: rule.scope,
        };
      });

      const totalAmount = vendorGroups.reduce(
        (sum, vendorGroup) => sum + vendorGroup.amount,
        0
      );

      return {
        method: input.method,
        currency: input.currency,
        totalAmount,
        etaMinDays: vendorGroups.reduce(
          (min, vendorGroup) => Math.min(min, vendorGroup.etaMinDays),
          vendorGroups[0]?.etaMinDays ?? 0
        ),
        etaMaxDays: vendorGroups.reduce(
          (max, vendorGroup) => Math.max(max, vendorGroup.etaMaxDays),
          vendorGroups[0]?.etaMaxDays ?? 0
        ),
        breakdown: vendorGroups,
      };
    }

    const rule = this.pickBestRule(activeRules, {
      countryCode: input.countryCode,
    });
    const totalAmount = this.calculateAmount(rule, {
      subtotalAmount: subtotalCurrent,
      distanceKm: input.distanceKm,
    });

    return {
      method: input.method,
      currency: input.currency,
      totalAmount,
      etaMinDays: rule.etaMinDays,
      etaMaxDays: rule.etaMaxDays,
      breakdown: [
        {
          vendorProfileId: null,
          amount: totalAmount,
          etaMinDays: rule.etaMinDays,
          etaMaxDays: rule.etaMaxDays,
          ruleId: rule.id,
          scope: rule.scope,
        },
      ],
    };
  }

  async listAvailableMethods(input: {
    countryCode?: string;
    vendorProfileIds: string[];
  }) {
    const methods: DeliveryMethod[] = ["PICKUP", "EXPRESS", "STANDARD"];
    const results = await Promise.all(
      methods.map(async (method) => {
        const rules = await this.deliveryRuleRepository.listActiveByMethod(method);

        const available = method === "EXPRESS"
          ? input.vendorProfileIds.every((vendorProfileId) =>
              this.hasMatchingRule(rules, {
                vendorProfileId,
                countryCode: input.countryCode,
              })
            )
          : this.hasMatchingRule(rules, {
              countryCode: input.countryCode,
            });

        return {
          method,
          available,
        };
      })
    );

    return results.filter((entry) => entry.available);
  }

  private hasMatchingRule(
    rules: Awaited<ReturnType<DeliveryRuleRepository["listActiveByMethod"]>>,
    target: {
      vendorProfileId?: string;
      countryCode?: string;
    }
  ) {
    return rules.some((rule) => {
      if (rule.scope === "VENDOR") {
        return rule.vendorProfileId === target.vendorProfileId;
      }

      if (rule.scope === "COUNTRY") {
        return (
          !!target.countryCode &&
          rule.countryCode?.toUpperCase() === target.countryCode.toUpperCase()
        );
      }

      return rule.scope === "GLOBAL";
    });
  }

  private pickBestRule(
    rules: Awaited<ReturnType<DeliveryRuleRepository["listActiveByMethod"]>>,
    target: {
      vendorProfileId?: string;
      countryCode?: string;
    }
  ) {
    const vendorRule =
      target.vendorProfileId
        ? rules.find(
            (rule) =>
              rule.scope === "VENDOR" &&
              rule.vendorProfileId === target.vendorProfileId
          )
        : null;

    if (vendorRule) {
      return vendorRule;
    }

    const countryRule =
      target.countryCode
        ? rules.find(
            (rule) =>
              rule.scope === "COUNTRY" &&
              rule.countryCode?.toUpperCase() ===
                target.countryCode?.toUpperCase()
          )
        : null;

    if (countryRule) {
      return countryRule;
    }

    const globalRule = rules.find((rule) => rule.scope === "GLOBAL");

    if (!globalRule) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "No matching delivery rule found for this destination",
        statusCode: 400,
      });
    }

    return globalRule;
  }

  private calculateAmount(
    rule: NonNullable<Awaited<ReturnType<DeliveryRuleRepository["findById"]>>>,
    input: {
      subtotalAmount: number;
      distanceKm?: number;
    }
  ) {
    if (rule.priceModel === "FLAT") {
      return rule.baseFeeAmount;
    }

    if (rule.priceModel === "FREE_ABOVE") {
      if ((rule.freeAboveAmount ?? 0) <= input.subtotalAmount) {
        return 0;
      }

      return rule.baseFeeAmount;
    }

    if (input.distanceKm === undefined) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "distanceKm is required for distance-based delivery",
        statusCode: 400,
      });
    }

    return rule.baseFeeAmount + Math.ceil(input.distanceKm) * (rule.perKmRateAmount ?? 0);
  }
}
