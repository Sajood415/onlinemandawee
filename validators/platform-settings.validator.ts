import { z } from "zod";

import { SUPPORTED_CURRENCIES } from "@/lib/currency/constants";
import { ALL_STOREFRONT_LOCALES } from "@/lib/platform/storefront-options";

export const updatePlatformSettingsSchema = z.object({
  availableLocales: z
    .array(z.enum(ALL_STOREFRONT_LOCALES))
    .min(1, "At least one language must be enabled")
    .optional(),
  availableCurrencies: z
    .array(z.enum(SUPPORTED_CURRENCIES))
    .min(1, "At least one currency must be enabled")
    .optional(),
  // Omit a field to leave it unchanged; send "" to clear it.
  warehouseAddressLine1: z.string().trim().max(200).optional(),
  warehouseCity: z.string().trim().max(120).optional(),
  warehouseCountry: z.string().trim().max(120).optional(),
  warehousePostalCode: z.string().trim().max(30).optional(),
});
