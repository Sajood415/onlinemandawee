import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { CartRepository } from "@/repositories/cart.repository";
import { CustomerAddressRepository } from "@/repositories/customer-address.repository";
import { DeliveryPricingService } from "@/services/delivery-pricing.service";

export class CheckoutService {
  constructor(
    private readonly cartRepository = new CartRepository(),
    private readonly customerAddressRepository = new CustomerAddressRepository(),
    private readonly deliveryPricingService = new DeliveryPricingService()
  ) {}

  async quote(
    auth: AuthenticatedUser,
    input: {
      addressId?: string;
      method?: "PICKUP" | "EXPRESS" | "STANDARD";
      currency?: string;
      distanceKm?: number;
    }
  ) {
    if (auth.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active customers can create checkout quotes",
        statusCode: 403,
      });
    }

    const cart = await this.cartRepository.findByUserId(auth.id);

    if (!cart || cart.items.length === 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cart is empty",
        statusCode: 400,
      });
    }

    const address = input.addressId
      ? await this.customerAddressRepository.findById(input.addressId)
      : null;

    if (input.addressId && (!address || address.userId !== auth.id)) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Address not found",
        statusCode: 404,
      });
    }

    const quoteCurrency = input.currency ?? cart.currency;

    const items = cart.items.map((item) => {
      const currentUnitPrice = item.product.priceAmount;
      const snapshotLineTotal = item.unitPriceSnapshot * item.quantity;
      const currentLineTotal = currentUnitPrice * item.quantity;
      const isAvailable =
        item.product.approvalStatus === "APPROVED" &&
        item.product.isActive &&
        item.product.vendorProfile.status === "ACTIVE" &&
        item.product.stockQty >= item.quantity;

      return {
        cartItemId: item.id,
        productId: item.productId,
        vendorProfileId: item.vendorProfileId,
        vendorStoreSlug: item.product.vendorProfile.storeSlug,
        vendorStoreName: item.product.vendorProfile.storeName,
        quantity: item.quantity,
        snapshotCurrency: item.currencySnapshot,
        snapshotUnitPrice: item.unitPriceSnapshot,
        snapshotLineTotal,
        currentCurrency: item.product.currency,
        currentUnitPrice,
        currentLineTotal,
        productName: item.product.name,
        productImage: item.product.images[0] ?? null,
        snapshotChanged:
          item.currencySnapshot !== item.product.currency ||
          item.unitPriceSnapshot !== currentUnitPrice ||
          item.productNameSnapshot !== item.product.name,
        isAvailable,
      };
    });

    const invalidItems = items.filter((item) => !item.isAvailable);

    if (invalidItems.length > 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Some cart items are no longer available",
        statusCode: 400,
        details: {
          invalidItemIds: invalidItems.map((item) => item.cartItemId),
        },
      });
    }

    const groupedByVendor = items.reduce<
      Record<
        string,
        {
          vendorProfileId: string;
          vendorStoreSlug: string | null;
          vendorStoreName: string | null;
          subtotalSnapshot: number;
          subtotalCurrent: number;
          items: typeof items;
        }
      >
    >((accumulator, item) => {
      const key = item.vendorProfileId;

      if (!accumulator[key]) {
        accumulator[key] = {
          vendorProfileId: item.vendorProfileId,
          vendorStoreSlug: item.vendorStoreSlug ?? null,
          vendorStoreName: item.vendorStoreName ?? null,
          subtotalSnapshot: 0,
          subtotalCurrent: 0,
          items: [],
        };
      }

      accumulator[key].subtotalSnapshot += item.snapshotLineTotal;
      accumulator[key].subtotalCurrent += item.currentLineTotal;
      accumulator[key].items.push(item);

      return accumulator;
    }, {});

    const subtotalSnapshot = items.reduce(
      (sum, item) => sum + item.snapshotLineTotal,
      0
    );
    const subtotalCurrent = items.reduce(
      (sum, item) => sum + item.currentLineTotal,
      0
    );
    const deliveryQuote =
      address && input.method
        ? await this.deliveryPricingService.quote({
            method: input.method,
            countryCode: address.country,
            currency: quoteCurrency,
            distanceKm: input.distanceKm,
            items: items.map((item) => ({
              vendorProfileId: item.vendorProfileId,
              quantity: item.quantity,
              currentLineTotal: item.currentLineTotal,
            })),
            vendorGroups: Object.values(groupedByVendor).map((vendorGroup) => ({
              vendorProfileId: vendorGroup.vendorProfileId,
              subtotalCurrent: vendorGroup.subtotalCurrent,
            })),
          })
        : null;
    const deliveryTotal = deliveryQuote?.totalAmount ?? 0;

    return {
      currency: quoteCurrency,
      deliveryMethod: input.method ?? null,
      address: address
        ? {
            id: address.id,
            fullName: address.fullName,
            phone: address.phone,
            addressLine1: address.addressLine1,
            city: address.city,
            country: address.country,
            postalCode: address.postalCode,
          }
        : null,
      subtotalSnapshot,
      subtotalCurrent,
      deliveryTotal,
      discountTotal: 0,
      grandTotalSnapshot: subtotalSnapshot + deliveryTotal,
      grandTotalCurrent: subtotalCurrent + deliveryTotal,
      hasSnapshotChanges: items.some((item) => item.snapshotChanged),
      deliveryBreakdown: deliveryQuote?.breakdown ?? [],
      deliveryEta: deliveryQuote
        ? {
            minDays: deliveryQuote.etaMinDays,
            maxDays: deliveryQuote.etaMaxDays,
          }
        : null,
      vendorGroups: Object.values(groupedByVendor).map((vendorGroup) => ({
        ...vendorGroup,
        deliveryAmount:
          deliveryQuote?.breakdown.find(
            (entry) => entry.vendorProfileId === vendorGroup.vendorProfileId
          )?.amount ?? 0,
      })),
    };
  }
}
