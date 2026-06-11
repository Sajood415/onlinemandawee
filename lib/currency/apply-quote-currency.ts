import { convertMinorUnits } from "@/lib/currency/convert";
import { normalizeCurrency } from "@/lib/currency/constants";
import type { GuestCheckoutQuote } from "@/lib/checkout/build-guest-checkout-quote";

/** Re-denominate a guest checkout quote into the customer's selected currency. */
export function applyQuoteCurrency(
  quote: GuestCheckoutQuote,
  targetCurrency?: string
): GuestCheckoutQuote {
  const currency = normalizeCurrency(targetCurrency ?? quote.currency);

  const lineItems = quote.lineItems.map((item) => {
    const unitPriceAmount = convertMinorUnits(
      item.unitPriceAmount,
      item.currency,
      currency
    );
    const lineTotalAmount = convertMinorUnits(
      item.lineTotalAmount,
      item.currency,
      currency
    );
    return {
      ...item,
      unitPriceAmount,
      lineTotalAmount,
      currency,
    };
  });

  const appliedCoupons = quote.appliedCoupons.map((coupon) => ({
    ...coupon,
    discountAmount: convertMinorUnits(
      coupon.discountAmount,
      quote.currency,
      currency
    ),
  }));

  const vendorSummaries = quote.vendorSummaries.map((summary) => ({
    ...summary,
    subtotalAmount: convertMinorUnits(summary.subtotalAmount, quote.currency, currency),
    discountAmount: convertMinorUnits(summary.discountAmount, quote.currency, currency),
    deliveryAmount: convertMinorUnits(summary.deliveryAmount, quote.currency, currency),
    grandTotalAmount: convertMinorUnits(summary.grandTotalAmount, quote.currency, currency),
  }));

  const deliveryBreakdown = quote.deliveryBreakdown?.map((entry) => ({
    ...entry,
    baseFeeAmount: convertMinorUnits(entry.baseFeeAmount, quote.currency, currency),
    perKmRateAmount: convertMinorUnits(entry.perKmRateAmount, quote.currency, currency),
    deliveryAmount: convertMinorUnits(entry.deliveryAmount, quote.currency, currency),
  }));

  return {
    subtotalAmount: convertMinorUnits(quote.subtotalAmount, quote.currency, currency),
    deliveryAmount: convertMinorUnits(quote.deliveryAmount, quote.currency, currency),
    discountAmount: convertMinorUnits(quote.discountAmount, quote.currency, currency),
    grandTotalAmount: convertMinorUnits(quote.grandTotalAmount, quote.currency, currency),
    currency,
    lineItems,
    appliedCoupons,
    vendorSummaries,
    deliveryBreakdown,
  };
}
