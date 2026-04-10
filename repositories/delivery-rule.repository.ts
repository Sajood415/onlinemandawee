import type {
  DeliveryMethod,
  DeliveryPriceModel,
  DeliveryRuleScope,
} from "@/domain/delivery/delivery-types";
import { prisma } from "@/lib/db/prisma";

export class DeliveryRuleRepository {
  create(input: {
    method: DeliveryMethod;
    scope: DeliveryRuleScope;
    vendorProfileId?: string;
    countryCode?: string;
    priceModel: DeliveryPriceModel;
    baseFeeAmount: number;
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
        vendorProfileId: input.vendorProfileId ?? null,
        countryCode: input.countryCode ?? null,
        priceModel: input.priceModel,
        baseFeeAmount: input.baseFeeAmount,
        perKmRateAmount: input.perKmRateAmount ?? null,
        freeAboveAmount: input.freeAboveAmount ?? null,
        etaMinDays: input.etaMinDays,
        etaMaxDays: input.etaMaxDays,
        isActive: input.isActive ?? true,
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
        vendorProfileId: input.vendorProfileId ?? null,
        countryCode: input.countryCode ?? null,
        priceModel: input.priceModel,
        baseFeeAmount: input.baseFeeAmount,
        perKmRateAmount: input.perKmRateAmount ?? null,
        freeAboveAmount: input.freeAboveAmount ?? null,
        etaMinDays: input.etaMinDays,
        etaMaxDays: input.etaMaxDays,
        isActive: input.isActive ?? true,
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
}
