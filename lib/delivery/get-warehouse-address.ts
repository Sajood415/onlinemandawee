import "server-only";

import type { PostalAddress } from "@/lib/maps/google-maps";
import { PlatformSettingsRepository } from "@/repositories/platform-settings.repository";

const platformSettingsRepository = new PlatformSettingsRepository();

/**
 * Mandawee's own warehouse pickup address, configured by the admin in
 * Platform settings. Used as the delivery origin (instead of a vendor's
 * pickup address) for platform-sold items priced per kilometer.
 */
export async function getWarehouseAddress(): Promise<PostalAddress | null> {
  const settings = await platformSettingsRepository.getOrCreate();

  if (!settings.warehouseAddressLine1 || !settings.warehouseCity || !settings.warehouseCountry) {
    return null;
  }

  return {
    addressLine1: settings.warehouseAddressLine1,
    city: settings.warehouseCity,
    country: settings.warehouseCountry,
    postalCode: settings.warehousePostalCode ?? "",
  };
}
