import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
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
      addressId: string;
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

    const address = await this.customerAddressRepository.findById(input.addressId);

    if (!address || address.userId !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Address not found",
        statusCode: 404,
      });
    }

    const vendorProfileIds = [...new Set(cart.items.map((item) => item.vendorProfileId))];

    return this.deliveryPricingService.listAvailableMethods({
      countryCode: address.country,
      vendorProfileIds,
    });
  }

  async quote(
    auth: AuthenticatedUser,
    input: {
      addressId: string;
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

    const address = await this.customerAddressRepository.findById(input.addressId);

    if (!address || address.userId !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Address not found",
        statusCode: 404,
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

    return this.deliveryPricingService.quote({
      method: input.method,
      countryCode: address.country,
      currency,
      distanceKm: input.distanceKm,
      items,
      vendorGroups,
    });
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
