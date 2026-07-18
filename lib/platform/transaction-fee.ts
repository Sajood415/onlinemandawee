export const PLATFORM_SETTINGS_ID = "default";

/** Default platform commission: 399 bps = 3.99% of sale. */
export const DEFAULT_COMMISSION_RATE_BPS = 399;

/**
 * Legacy constant (399 cents). Do not use for settlement — commission is percentage-based.
 * @deprecated
 */
export const FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR = 399;

/** @deprecated */
export const DEFAULT_TRANSACTION_FEE_AMOUNT_MINOR =
  FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR;

/** 399 bps → "3.99%" */
export function formatCommissionRatePercent(
  rateBps: number = DEFAULT_COMMISSION_RATE_BPS
) {
  const percent = rateBps / 100;
  if (Number.isInteger(percent)) return `${percent}%`;
  return `${percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

/** e.g. "3.99% per sale" */
export function formatCommissionRateLabel(
  rateBps: number = DEFAULT_COMMISSION_RATE_BPS
) {
  return `${formatCommissionRatePercent(rateBps)} per sale`;
}

/** @deprecated Use formatCommissionRateLabel */
export function formatFlatTransactionFeeLabel(
  _amountMinor?: number,
  _currency = "USD"
) {
  return formatCommissionRateLabel();
}

export function calculateCommissionAmountMinor(input: {
  baseAmountMinor: number;
  rateBps?: number;
}) {
  const rateBps = input.rateBps ?? DEFAULT_COMMISSION_RATE_BPS;
  if (input.baseAmountMinor <= 0 || rateBps <= 0) return 0;
  return Math.round((input.baseAmountMinor * rateBps) / 10_000);
}

/** Flat $ fee no longer applies by delivery method — commission is always %. */
export function usesFixedTransactionFeeDeliveryMethod(
  _method: "PICKUP" | "EXPRESS" | "STANDARD" | null | undefined
) {
  return false;
}

/** @deprecated */
export function getFixedTransactionFeeAmountMinor() {
  return FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR;
}

/**
 * @deprecated Unused under percentage commission.
 */
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
