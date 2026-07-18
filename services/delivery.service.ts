import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { resolveDistanceDeliveryQuote } from "@/lib/delivery/resolve-distance-delivery";
import { CartRepository } from "@/repositories/cart.repository";
import { CustomerAddressRepository } from "@/repositories/customer-address.repository";
import { DeliveryPricingService } from "@/services/delivery-pricing.service";

export class DeliveryService {
  constructor(
    private readonly cartRepository = new CartRepository(),
    private readonly customerAddressRepository = new CustomerAddressRepository(),
    private readonly deliveryPricingService = new DeliveryPricingService()
  ) {}

  async listAvailableMethods(
    auth: AuthenticatedUser,
    input: {
      addressId?: string;
    }
  ) {
    this.assertActiveCustomer(auth);

    const cart = await this.cartRepository.findByUserId(auth.id);

    if (!cart || cart.items.length === 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cart is empty",
        statusCode: 400,
      });
    }

    let countryCode: string | undefined;
    if (input.addressId) {
      const address = await this.customerAddressRepository.findById(input.addressId);
      if (!address || address.userId !== auth.id) {
        throw new AppError({
          code: ERROR_CODE.NOT_FOUND,
          message: "Address not found",
          statusCode: 404,
        });
      }
      countryCode = address.country;
    }

    const vendorProfileIds = [...new Set(cart.items.map((item) => item.vendorProfileId))];

    return this.deliveryPricingService.listAvailableMethods({
      countryCode,
      vendorProfileIds,
    });
  }

  async quote(
    auth: AuthenticatedUser,
    input: {
      addressId?: string;
      method: "PICKUP" | "EXPRESS" | "STANDARD";
      currency?: string;
      distanceKm?: number;
    }
  ) {
    this.assertActiveCustomer(auth);

    const cart = await this.cartRepository.findByUserId(auth.id);

    if (!cart || cart.items.length === 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cart is empty",
        statusCode: 400,
      });
    }

    const currency = input.currency ?? cart.currency;
    const items = cart.items.map((item) => ({
      vendorProfileId: item.vendorProfileId,
      quantity: item.quantity,
      currentLineTotal: item.product.priceAmount * item.quantity,
    }));
    const vendorGroups = Object.values(
      items.reduce<Record<string, { vendorProfileId: string; subtotalCurrent: number }>>(
        (accumulator, item) => {
          accumulator[item.vendorProfileId] ??= {
            vendorProfileId: item.vendorProfileId,
            subtotalCurrent: 0,
          };
          accumulator[item.vendorProfileId].subtotalCurrent += item.currentLineTotal;
          return accumulator;
        },
        {}
      )
    );

    if (input.method === "PICKUP") {
      return {
        method: input.method,
        currency,
        totalAmount: 0,
        etaMinDays: 0,
        etaMaxDays: 0,
        breakdown: vendorGroups.map((vendorGroup) => ({
          vendorProfileId: vendorGroup.vendorProfileId,
          amount: 0,
          etaMinDays: 0,
          etaMaxDays: 0,
          ruleId: "pickup",
          scope: "GLOBAL",
        })),
      };
    }

    if (!input.addressId) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Delivery address is required for Express and Standard delivery",
        statusCode: 400,
      });
    }

    const address = await this.customerAddressRepository.findById(input.addressId);

    if (!address || address.userId !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Address not found",
        statusCode: 404,
      });
    }

    const deliveryQuote = await resolveDistanceDeliveryQuote({
      vendorProfileIds: [...new Set(items.map((item) => item.vendorProfileId))],
      deliveryAddress: {
        addressLine1: address.addressLine1,
        city: address.city,
        country: address.country,
        postalCode: address.postalCode,
      },
    });

    return {
      method: input.method,
      currency,
      totalAmount: deliveryQuote.totalAmount,
      etaMinDays: 0,
      etaMaxDays: 0,
      breakdown: deliveryQuote.breakdown.map((entry) => ({
        vendorProfileId: entry.vendorProfileId,
        amount: entry.deliveryAmount,
        distanceKm: entry.distanceKm,
        baseFeeAmount: entry.baseFeeAmount,
        perKmRateAmount: entry.perKmRateAmount,
        vendorStoreName: entry.vendorStoreName,
        etaMinDays: 0,
        etaMaxDays: 0,
        ruleId: "distance",
        scope: "GLOBAL",
      })),
    };
  }

  private assertActiveCustomer(auth: AuthenticatedUser) {
    if (auth.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active customers can access delivery quotes",
        statusCode: 403,
      });
    }
  }
}
