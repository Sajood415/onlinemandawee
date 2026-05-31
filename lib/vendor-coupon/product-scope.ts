export type CouponProductScope = {
  appliesToAllProducts: boolean;
  productIds: string[];
};

export function couponAppliesToProduct(
  scope: CouponProductScope,
  productId: string
): boolean {
  if (scope.appliesToAllProducts) return true;
  return scope.productIds.includes(productId);
}

export function getCouponEligibleSubtotal<
  T extends { productId: string; vendorProfileId: string; lineTotalAmount: number }
>(lineItems: T[], vendorProfileId: string, scope: CouponProductScope): number {
  return lineItems
    .filter(
      (item) =>
        item.vendorProfileId === vendorProfileId &&
        couponAppliesToProduct(scope, item.productId)
    )
    .reduce((sum, item) => sum + item.lineTotalAmount, 0);
}
