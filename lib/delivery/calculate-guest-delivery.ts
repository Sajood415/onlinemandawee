import "server-only";

import { GuestCheckoutQuoteError } from "@/lib/checkout/guest-checkout-quote-error";
import { getPlatformDeliveryRates } from "@/lib/delivery/get-platform-delivery-rates";
import {
  geocodeAddress,
  getDrivingDistanceKm,
  MapsApiError,
  type PostalAddress,
} from "@/lib/maps/google-maps";
import { prisma } from "@/lib/db/prisma";

export type GuestCheckoutDeliveryBreakdown = {
  vendorProfileId: string;
  vendorStoreName: string | null;
  distanceKm: number;
  baseFeeAmount: number;
  perKmRateAmount: number;
  deliveryAmount: number;
};

function calculatePerKmDeliveryAmount(
  distanceKm: number,
  rates: { baseFeeAmount: number; perKmRateAmount: number }
) {
  return rates.baseFeeAmount + Math.ceil(distanceKm) * rates.perKmRateAmount;
}

function toQuoteError(error: MapsApiError) {
  return new GuestCheckoutQuoteError(error.code, error.message, 400);
}

export async function calculateGuestDelivery(input: {
  vendorProfileIds: string[];
  deliveryAddress: PostalAddress;
}): Promise<{
  totalAmount: number;
  breakdown: GuestCheckoutDeliveryBreakdown[];
}> {
  const uniqueVendorIds = [...new Set(input.vendorProfileIds)];
  if (uniqueVendorIds.length === 0) {
    return { totalAmount: 0, breakdown: [] };
  }

  const vendors = await prisma.vendorProfile.findMany({
    where: { id: { in: uniqueVendorIds } },
    include: { address: true },
  });

  const missingAddressVendor = vendors.find((vendor) => !vendor.address);
  if (missingAddressVendor) {
    throw new GuestCheckoutQuoteError(
      "VENDOR_ADDRESS_MISSING",
      `The store "${missingAddressVendor.storeName ?? "Vendor"}" does not have a pickup address configured, so delivery cannot be calculated.`,
      400
    );
  }

  const rates = await getPlatformDeliveryRates();

  let customerCoordinates;
  try {
    customerCoordinates = await geocodeAddress(input.deliveryAddress);
  } catch (error) {
    if (error instanceof MapsApiError) throw toQuoteError(error);
    throw error;
  }

  const breakdown: GuestCheckoutDeliveryBreakdown[] = [];

  for (const vendorProfileId of uniqueVendorIds) {
    const vendor = vendors.find((entry) => entry.id === vendorProfileId);
    if (!vendor?.address) {
      throw new GuestCheckoutQuoteError(
        "VENDOR_ADDRESS_MISSING",
        "A vendor in your cart is missing a pickup address.",
        400
      );
    }

    let vendorCoordinates;
    try {
      vendorCoordinates = await geocodeAddress({
        addressLine1: vendor.address.addressLine1,
        city: vendor.address.city,
        country: vendor.address.country,
        postalCode: vendor.address.postalCode,
      });
    } catch (error) {
      if (error instanceof MapsApiError) {
        throw new GuestCheckoutQuoteError(
          "VENDOR_ADDRESS_NOT_FOUND",
          `Could not locate the pickup address for "${vendor.storeName ?? "Vendor"}".`,
          400
        );
      }
      throw error;
    }

    let distanceKm: number;
    try {
      distanceKm = await getDrivingDistanceKm(vendorCoordinates, customerCoordinates);
    } catch (error) {
      if (error instanceof MapsApiError) throw toQuoteError(error);
      throw error;
    }

    const deliveryAmount = calculatePerKmDeliveryAmount(distanceKm, rates);
    breakdown.push({
      vendorProfileId,
      vendorStoreName: vendor.storeName,
      distanceKm: Math.round(distanceKm * 10) / 10,
      baseFeeAmount: rates.baseFeeAmount,
      perKmRateAmount: rates.perKmRateAmount,
      deliveryAmount,
    });
  }

  const totalAmount = breakdown.reduce((sum, entry) => sum + entry.deliveryAmount, 0);
  return { totalAmount, breakdown };
}
