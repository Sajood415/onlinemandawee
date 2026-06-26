import type { DeliveryMethod } from "@/domain/delivery/delivery-types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  findBestMatchingDeliveryRule,
  hasMatchingDeliveryRule,
} from "@/lib/delivery/match-delivery-rule";
import { normalizeDeliveryCountryCode } from "@/lib/geo/shipping-locations";
import { convertDeliveryRuleAmountMinor } from "@/lib/delivery/delivery-rule-currency";
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

    const countryCode = normalizeDeliveryCountryCode(input.countryCode);
    const vendorProfileIds = input.vendorGroups.map(
      (vendorGroup) => vendorGroup.vendorProfileId
    );

    if (input.method === "EXPRESS") {
      const vendorGroups = input.vendorGroups.map((vendorGroup) => {
        const rule = this.pickBestRule(activeRules, {
          vendorProfileId: vendorGroup.vendorProfileId,
          countryCode,
        });

        const amountUsdMinor = this.calculateAmount(rule, {
          subtotalAmount: vendorGroup.subtotalCurrent,
          distanceKm: input.distanceKm,
        });

        return {
          vendorProfileId: vendorGroup.vendorProfileId,
          amount: convertDeliveryRuleAmountMinor(amountUsdMinor, input.currency),
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
      countryCode,
      vendorProfileIds,
    });
    const totalAmountUsdMinor = this.calculateAmount(rule, {
      subtotalAmount: subtotalCurrent,
      distanceKm: input.distanceKm,
    });
    const totalAmount = convertDeliveryRuleAmountMinor(
      totalAmountUsdMinor,
      input.currency
    );

    return {
      method: input.method,
      currency: input.currency,
      totalAmount,
      etaMinDays: rule.etaMinDays,
      etaMaxDays: rule.etaMaxDays,
      breakdown: this.allocateSharedDelivery({
        totalAmount,
        etaMinDays: rule.etaMinDays,
        etaMaxDays: rule.etaMaxDays,
        ruleId: rule.id,
        scope: rule.scope,
        vendorGroups: input.vendorGroups,
      }),
    };
  }

  async listAvailableMethods(input: {
    countryCode?: string;
    vendorProfileIds: string[];
  }) {
    const countryCode = normalizeDeliveryCountryCode(input.countryCode);
    const methods: DeliveryMethod[] = ["PICKUP", "EXPRESS", "STANDARD"];
    const results = await Promise.all(
      methods.map(async (method) => {
        const rules = await this.deliveryRuleRepository.listActiveByMethod(method);

        const available = method === "EXPRESS"
          ? input.vendorProfileIds.every((vendorProfileId) =>
              hasMatchingDeliveryRule(rules, {
                vendorProfileId,
                countryCode,
              })
            )
          : hasMatchingDeliveryRule(rules, {
              countryCode,
              vendorProfileIds: input.vendorProfileIds,
            });

        return {
          method,
          available,
        };
      })
    );

    return results.filter((entry) => entry.available);
  }

  private pickBestRule(
    rules: Awaited<ReturnType<DeliveryRuleRepository["listActiveByMethod"]>>,
    target: {
      vendorProfileId?: string;
      vendorProfileIds?: string[];
      countryCode?: string;
    }
  ) {
    const rule = findBestMatchingDeliveryRule(rules, target);

    if (!rule) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "No matching delivery rule found for this destination",
        statusCode: 400,
      });
    }

    return rule;
  }

  private calculateAmount(
    rule: NonNullable<Awaited<ReturnType<DeliveryRuleRepository["findById"]>>>,
    input: {
      subtotalAmount: number;
      distanceKm?: number;
    }
  ) {
    if (rule.method === "PICKUP") {
      return 0;
    }

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

  private allocateSharedDelivery(input: {
    totalAmount: number;
    etaMinDays: number;
    etaMaxDays: number;
    ruleId: string;
    scope: string;
    vendorGroups: DeliveryQuoteVendorGroup[];
  }) {
    if (input.vendorGroups.length === 0) {
      return [];
    }

    if (input.vendorGroups.length === 1) {
      return [
        {
          vendorProfileId: input.vendorGroups[0].vendorProfileId,
          amount: input.totalAmount,
          etaMinDays: input.etaMinDays,
          etaMaxDays: input.etaMaxDays,
          ruleId: input.ruleId,
          scope: input.scope,
        },
      ];
    }

    const subtotalTotal = input.vendorGroups.reduce(
      (sum, vendorGroup) => sum + vendorGroup.subtotalCurrent,
      0
    );
    let allocated = 0;

    return input.vendorGroups.map((vendorGroup, index) => {
      const isLast = index === input.vendorGroups.length - 1;
      const amount = isLast
        ? input.totalAmount - allocated
        : subtotalTotal > 0
          ? Math.floor((input.totalAmount * vendorGroup.subtotalCurrent) / subtotalTotal)
          : Math.floor(input.totalAmount / input.vendorGroups.length);

      allocated += amount;

      return {
        vendorProfileId: vendorGroup.vendorProfileId,
        amount,
        etaMinDays: input.etaMinDays,
        etaMaxDays: input.etaMaxDays,
        ruleId: input.ruleId,
        scope: input.scope,
      };
    });
  }
}
