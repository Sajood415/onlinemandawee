export const PLATFORM_SETTINGS_ID = "default";

export const DEFAULT_TRANSACTION_FEE_AMOUNT_MINOR = 399;

export function allocateFlatFeeToVendorSplit(input: {
  vendorSubtotalAmount: number;
  orderSubtotalAmount: number;
  flatFeeAmountMinor: number;
}): number {
  if (input.flatFeeAmountMinor <= 0) return 0;
  if (input.orderSubtotalAmount <= 0 || input.vendorSubtotalAmount <= 0) return 0;

  return Math.round(
    (input.vendorSubtotalAmount / input.orderSubtotalAmount) *
      input.flatFeeAmountMinor
  );
}

export function formatFlatTransactionFeeLabel(amountMinor: number, currency = "USD") {
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
    return `${formatted} per order`;
  } catch {
    return `$${(amountMinor / 100).toFixed(2)} per order`;
  }
}
