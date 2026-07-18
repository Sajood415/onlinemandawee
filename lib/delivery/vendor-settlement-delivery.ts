type DeliveryMethod = "PICKUP" | "EXPRESS" | "STANDARD" | null | undefined;
type SellerType = "PLATFORM" | "THIRD_PARTY" | null | undefined;

/**
 * Delivery amount that settles to the vendor (payout / OrderVendor.deliveryAmount).
 *
 * - PLATFORM shop: keeps its delivery share (Mandawee revenue on its own orders).
 * - STANDARD (outside vendors): always 0 — customer still pays; fee stays with Mandawee.
 * - EXPRESS (outside vendors): vendor gets the quoted Express fee.
 * - PICKUP: 0.
 */
export function resolveVendorSettlementDeliveryAmount(input: {
  deliveryMethod: DeliveryMethod;
  quotedDeliveryAmount: number;
  sellerType?: SellerType;
}) {
  const amount = Math.max(0, input.quotedDeliveryAmount);
  if (amount <= 0) return 0;
  if (input.deliveryMethod === "PICKUP") return 0;
  if (input.sellerType === "PLATFORM") return amount;
  if (input.deliveryMethod === "STANDARD") return 0;
  return amount;
}
