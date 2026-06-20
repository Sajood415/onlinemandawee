export const orderStatuses = [
  "CREATED",
  "PAID",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const paymentStatuses = [
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export const vendorOrderStatuses = [
  "NEW",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type VendorOrderStatus = (typeof vendorOrderStatuses)[number];

/** Admin-facing order list filters (maps to platform + vendor + payment fields). */
export const adminOrderStatusFilters = [
  "PENDING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type AdminOrderStatusFilter = (typeof adminOrderStatusFilters)[number];
