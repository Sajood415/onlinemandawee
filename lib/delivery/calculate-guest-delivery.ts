import "server-only";

import { GuestCheckoutQuoteError } from "@/lib/checkout/guest-checkout-quote-error";
import { getPlatformDeliveryRates } from "@/lib/delivery/get-platform-delivery-rates";
import { getWarehouseAddress } from "@/lib/delivery/get-warehouse-address";
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

/** Geocode two addresses and return the driving distance (km) between them. */
export async function getDistanceKmBetweenAddresses(
  origin: PostalAddress,
  destination: PostalAddress
): Promise<number> {
  let originCoordinates;
  try {
    originCoordinates = await geocodeAddress(origin);
  } catch (error) {
    if (error instanceof MapsApiError) throw toQuoteError(error);
    throw error;
  }

  let destinationCoordinates;
  try {
    destinationCoordinates = await geocodeAddress(destination);
  } catch (error) {
    if (error instanceof MapsApiError) throw toQuoteError(error);
    throw error;
  }

  try {
    return await getDrivingDistanceKm(originCoordinates, destinationCoordinates);
  } catch (error) {
    if (error instanceof MapsApiError) throw toQuoteError(error);
    throw error;
  }
}

export type VendorDistanceEntry = {
  distanceKm: number;
  vendorStoreName: string | null;
};

/**
 * Geocode a customer delivery address plus each vendor's pickup address and
 * return the driving distance (km) between them. Shared by the platform
 * (1P) per-KM delivery path and any third-party rule that uses PER_KM
 * pricing (e.g. an admin-configured per-KM express rate).
 */
export async function getVendorDistancesKm(
  vendorProfileIds: string[],
  deliveryAddress: PostalAddress
): Promise<Map<string, VendorDistanceEntry>> {
  const uniqueVendorIds = [...new Set(vendorProfileIds)];
  const result = new Map<string, VendorDistanceEntry>();
  if (uniqueVendorIds.length === 0) {
    return result;
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

  let customerCoordinates;
  try {
    customerCoordinates = await geocodeAddress(deliveryAddress);
  } catch (error) {
    if (error instanceof MapsApiError) throw toQuoteError(error);
    throw error;
  }

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

    result.set(vendorProfileId, {
      distanceKm: Math.round(distanceKm * 10) / 10,
      vendorStoreName: vendor.storeName,
    });
  }

  return result;
}

/**
 * Platform (1P) items ship from Mandawee's own warehouse, not from an
 * individual vendor's address, so the delivery distance is calculated once
 * (warehouse → customer) and the resulting charge is shared across the
 * platform items in the order — one shipment, one per-KM charge.
 */
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

  const warehouseAddress = await getWarehouseAddress();
  if (!warehouseAddress) {
    throw new GuestCheckoutQuoteError(
      "WAREHOUSE_ADDRESS_MISSING",
      "Delivery cannot be calculated because the warehouse pickup address has not been configured yet. Please contact support.",
      400
    );
  }

  const rates = await getPlatformDeliveryRates();
  const rawDistanceKm = await getDistanceKmBetweenAddresses(warehouseAddress, input.deliveryAddress);
  const distanceKm = Math.round(rawDistanceKm * 10) / 10;
  const totalAmount = calculatePerKmDeliveryAmount(distanceKm, rates);

  const vendors = await prisma.vendorProfile.findMany({
    where: { id: { in: uniqueVendorIds } },
    select: { id: true, storeName: true },
  });

  const perVendorShare = Math.floor(totalAmount / uniqueVendorIds.length);
  let allocated = 0;
  const breakdown: GuestCheckoutDeliveryBreakdown[] = uniqueVendorIds.map(
    (vendorProfileId, index) => {
      const vendor = vendors.find((entry) => entry.id === vendorProfileId);
      const isLast = index === uniqueVendorIds.length - 1;
      const deliveryAmount = isLast ? totalAmount - allocated : perVendorShare;
      allocated += deliveryAmount;

      return {
        vendorProfileId,
        vendorStoreName: vendor?.storeName ?? null,
        distanceKm,
        baseFeeAmount: rates.baseFeeAmount,
        perKmRateAmount: rates.perKmRateAmount,
        deliveryAmount,
      };
    }
  );

  return { totalAmount, breakdown };
}
