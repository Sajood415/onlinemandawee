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
});
