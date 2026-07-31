/** Unpaid quotes expire after this many hours. */
export const SUPPLY_REQUEST_QUOTE_EXPIRY_HOURS = 72;

export const UNPAID_SUPPLY_STATUSES = [
  "SUBMITTED",
  "REVIEWING",
  "AWAITING_PAYMENT",
] as const;
