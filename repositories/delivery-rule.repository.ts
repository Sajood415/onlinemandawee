import type {
  DeliveryMethod,
  DeliveryPriceModel,
  DeliveryRuleScope,
} from "@/domain/delivery/delivery-types";
import { pickBestDeliveryRule } from "@/lib/delivery/resolve-delivery-rule";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

function buildVendorProfileCreateRelation(
  vendorProfileId?: string
): Pick<Prisma.DeliveryRuleCreateInput, "vendorProfile"> {
  if (!vendorProfileId) {
    return {};
  }

  return {
    vendorProfile: {
      connect: { id: vendorProfileId },
    },
  };
}

function buildVendorProfileUpdateRelation(
  vendorProfileId?: string
): Pick<Prisma.DeliveryRuleUpdateInput, "vendorProfile"> {
  if (vendorProfileId) {
    return {
      vendorProfile: {
        connect: { id: vendorProfileId },
      },
    };
  }

  return {
    vendorProfile: {
      disconnect: true,
    },
  };
}

export class DeliveryRuleRepository {
  create(input: {
    method: DeliveryMethod;
    scope: DeliveryRuleScope;
    vendorProfileId?: string;
    countryCode?: string;
    priceModel: DeliveryPriceModel;
    baseFeeAmount: number;
    transactionFeeAmountMinor?: number | null;
    commissionRateBps?: number | null;
    perKmRateAmount?: number;
    freeAboveAmount?: number;
    etaMinDays: number;
    etaMaxDays: number;
    isActive?: boolean;
  }) {
    return prisma.deliveryRule.create({
      data: {
        method: input.method,
        scope: input.scope,
        countryCode: input.countryCode ?? null,
        priceModel: input.priceModel,
        baseFeeAmount: input.baseFeeAmount,
        transactionFeeAmountMinor: null,
        commissionRateBps: input.commissionRateBps ?? null,
        perKmRateAmount: input.perKmRateAmount ?? null,
        freeAboveAmount: input.freeAboveAmount ?? null,
        etaMinDays: input.etaMinDays,
        etaMaxDays: input.etaMaxDays,
        isActive: input.isActive ?? true,
        ...buildVendorProfileCreateRelation(input.vendorProfileId),
      },
      include: {
        vendorProfile: true,
      },
    });
  }

  update(input: {
    id: string;
    method: DeliveryMethod;
    scope: DeliveryRuleScope;
    vendorProfileId?: string;
    countryCode?: string;
    priceModel: DeliveryPriceModel;
    baseFeeAmount: number;
    transactionFeeAmountMinor?: number | null;
    commissionRateBps?: number | null;
    perKmRateAmount?: number;
    freeAboveAmount?: number;
    etaMinDays: number;
    etaMaxDays: number;
    isActive?: boolean;
  }) {
    return prisma.deliveryRule.update({
      where: { id: input.id },
      data: {
        method: input.method,
        scope: input.scope,
        countryCode: input.countryCode ?? null,
        priceModel: input.priceModel,
        baseFeeAmount: input.baseFeeAmount,
        transactionFeeAmountMinor: null,
        commissionRateBps: input.commissionRateBps ?? null,
        perKmRateAmount: input.perKmRateAmount ?? null,
        freeAboveAmount: input.freeAboveAmount ?? null,
        etaMinDays: input.etaMinDays,
        etaMaxDays: input.etaMaxDays,
        isActive: input.isActive ?? true,
        ...buildVendorProfileUpdateRelation(input.vendorProfileId),
      },
      include: {
        vendorProfile: true,
      },
    });
  }

  findById(id: string) {
    return prisma.deliveryRule.findUnique({
      where: { id },
      include: {
        vendorProfile: true,
      },
    });
  }

  listAll() {
    return prisma.deliveryRule.findMany({
      include: {
        vendorProfile: true,
      },
      orderBy: [{ method: "asc" }, { scope: "asc" }, { createdAt: "desc" }],
    });
  }

  listActiveByMethod(method: DeliveryMethod) {
    return prisma.deliveryRule.findMany({
      where: {
        method,
        isActive: true,
      },
      include: {
        vendorProfile: true,
      },
      orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
    });
  }

  async findBestActiveRule(input: {
    method: DeliveryMethod;
    vendorProfileId?: string;
    countryCode?: string;
  }) {
    const rules = await this.listActiveByMethod(input.method);
    return pickBestDeliveryRule(rules, input);
  }

  findFirstActiveByMethodAndScope(input: {
    method: DeliveryMethod;
    scope: DeliveryRuleScope;
    vendorProfileId?: string;
    countryCode?: string;
    excludeId?: string;
  }) {
    return prisma.deliveryRule.findFirst({
      where: {
        method: input.method,
        scope: input.scope,
        isActive: true,
        ...(input.scope === "VENDOR" && input.vendorProfileId
          ? { vendorProfileId: input.vendorProfileId }
          : {}),
        ...(input.scope === "COUNTRY" && input.countryCode
          ? { countryCode: input.countryCode }
          : {}),
        ...(input.excludeId
          ? {
              id: {
                not: input.excludeId,
              },
            }
          : {}),
      },
      include: {
        vendorProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listActiveVendorScopedByMethod(method: DeliveryMethod) {
    return prisma.deliveryRule.findMany({
      where: {
        method,
        scope: "VENDOR",
        isActive: true,
      },
      include: {
        vendorProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  deleteById(id: string) {
    return prisma.deliveryRule.delete({
      where: { id },
    });
  }

  async deleteAll() {
    const result = await prisma.deliveryRule.deleteMany({});
    return result.count;
  }
}
