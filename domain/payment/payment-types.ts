export const paymentProviders = ["STRIPE", "PAYPAL"] as const;
export const paymentTransactionStatuses = ["SUCCEEDED", "FAILED"] as const;
export const ledgerBuckets = ["HOLD", "AVAILABLE"] as const;
export const vendorLedgerEntryTypes = [
  "SALE_HOLD",
  "HOLD_RELEASE_DEBIT",
  "HOLD_RELEASE_CREDIT",
  "PAYOUT_DEBIT",
  "REFUND_DEBIT_HOLD",
  "REFUND_DEBIT_AVAILABLE",
] as const;
export const payoutStatuses = ["ON_HOLD", "READY", "SENT", "FAILED"] as const;

export type PaymentProvider = (typeof paymentProviders)[number];
export type PaymentTransactionStatus =
  (typeof paymentTransactionStatuses)[number];
export type LedgerBucket = (typeof ledgerBuckets)[number];
export type VendorLedgerEntryType =
  (typeof vendorLedgerEntryTypes)[number];
export type PayoutStatus = (typeof payoutStatuses)[number];
