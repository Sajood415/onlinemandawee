import "server-only";

import type { PostalAddress } from "@/lib/maps/google-maps";
import {
  isAfghanistanCountry,
  normalizeDeliveryCountryCode,
} from "@/lib/geo/shipping-locations";
import { getStripeServerClient } from "@/lib/stripe/server";

/** Stripe tax code: General — Tangible Goods */
const TANGIBLE_GOODS_TAX_CODE = "txcd_99999999";

export type CheckoutTaxLineItem = {
  amount: number;
  quantity: number;
  reference: string;
};

/**
 * Calculate exclusive sales tax via Stripe Tax for the buyer's shipping address.
 * Returns 0 for Afghanistan, missing country, or when Stripe Tax is unavailable.
 */
export async function calculateCheckoutTaxAmount(input: {
  currency: string;
  lineItems: CheckoutTaxLineItem[];
  deliveryAmount: number;
  deliveryAddress?: PostalAddress | null;
}): Promise<{ taxAmount: number; stripeTaxCalculationId: string | null }> {
  const address = input.deliveryAddress;
  if (!address?.country?.trim()) {
    return { taxAmount: 0, stripeTaxCalculationId: null };
  }

  if (isAfghanistanCountry(address.country)) {
    return { taxAmount: 0, stripeTaxCalculationId: null };
  }

  const country = normalizeDeliveryCountryCode(address.country);
  if (!country || country.length !== 2) {
    return { taxAmount: 0, stripeTaxCalculationId: null };
  }

  const taxableLines = input.lineItems.filter((item) => item.amount > 0 && item.quantity > 0);
  if (taxableLines.length === 0 && input.deliveryAmount <= 0) {
    return { taxAmount: 0, stripeTaxCalculationId: null };
  }

  try {
    const stripe = getStripeServerClient();
    const calculation = await stripe.tax.calculations.create({
      currency: input.currency.toLowerCase(),
      customer_details: {
        address: {
          line1: address.addressLine1 || undefined,
          city: address.city || undefined,
          postal_code: address.postalCode || undefined,
          country,
        },
        address_source: "shipping",
      },
      line_items: taxableLines.map((item, index) => ({
        amount: item.amount,
        quantity: item.quantity,
        reference: item.reference.slice(0, 100) || `item_${index}`,
        tax_code: TANGIBLE_GOODS_TAX_CODE,
        tax_behavior: "exclusive" as const,
      })),
      ...(input.deliveryAmount > 0
        ? {
            shipping_cost: {
              amount: input.deliveryAmount,
              tax_behavior: "exclusive" as const,
            },
          }
        : {}),
    });

    const taxAmount =
      typeof calculation.tax_amount_exclusive === "number"
        ? Math.max(0, calculation.tax_amount_exclusive)
        : 0;

    return {
      taxAmount,
      stripeTaxCalculationId: calculation.id ?? null,
    };
  } catch (error) {
    console.error("[checkout-tax] Stripe Tax calculation failed", error);
    // Fail open: don't block checkout if Tax API errors (e.g. unsupported country).
    return { taxAmount: 0, stripeTaxCalculationId: null };
  }
}
