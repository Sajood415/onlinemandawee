import type { VendorOrderStatus } from "@/domain/order/order-status";

export type OrderCancelledByRole = "CUSTOMER" | "VENDOR" | "ADMIN" | "SYSTEM";

const PRE_SHIP_VENDOR_STATUSES: VendorOrderStatus[] = ["NEW", "PREPARING"];

export type CustomerCancelBlockReason = "ORDER_ALREADY_CANCELLED" | "ORDER_ALREADY_SHIPPED";

export function canCustomerCancelBeforeShipping(input: {
  orderStatus: string;
  vendorOrders: Array<{
    status: VendorOrderStatus;
    inboundShipmentStatus?: string | null;
  }>;
}): { eligible: boolean; reason?: CustomerCancelBlockReason } {
  if (input.orderStatus === "CANCELLED") {
    return { eligible: false, reason: "ORDER_ALREADY_CANCELLED" };
  }

  for (const vendorOrder of input.vendorOrders) {
    if (!PRE_SHIP_VENDOR_STATUSES.includes(vendorOrder.status)) {
      return { eligible: false, reason: "ORDER_ALREADY_SHIPPED" };
    }

    const inboundStatus = vendorOrder.inboundShipmentStatus;
    if (inboundStatus === "INBOUND_SHIPPED" || inboundStatus === "RECEIVED") {
      return { eligible: false, reason: "ORDER_ALREADY_SHIPPED" };
    }
  }

  return { eligible: true };
}

export function isOrderLockedByCustomerCancellation(
  cancelledByRole: OrderCancelledByRole | null | undefined
) {
  return cancelledByRole === "CUSTOMER";
}

export function getCustomerCancellationState(input: {
  status: string;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  cancelledByRole?: OrderCancelledByRole | null;
  vendorOrders: Array<{
    status: VendorOrderStatus;
    inboundShipmentStatus?: string | null;
  }>;
}) {
  const isCancelledByCustomer = isOrderLockedByCustomerCancellation(input.cancelledByRole);

  if (input.status === "CANCELLED" || isCancelledByCustomer) {
    return {
      canCancel: false,
      isCancelledByCustomer,
      cancelledAt: input.cancelledAt?.toISOString() ?? null,
      cancellationReason: input.cancellationReason ?? null,
      cancelBlockReason: isCancelledByCustomer ? ("ORDER_ALREADY_CANCELLED" as const) : null,
    };
  }

  const eligibility = canCustomerCancelBeforeShipping({
    orderStatus: input.status,
    vendorOrders: input.vendorOrders,
  });

  return {
    canCancel: eligibility.eligible,
    isCancelledByCustomer: false,
    cancelledAt: null,
    cancellationReason: null,
    cancelBlockReason: eligibility.reason ?? null,
  };
}
