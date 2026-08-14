import { getWarehouseAddress } from "@/lib/delivery/get-warehouse-address";
import type { GuestPublicOrder } from "@/lib/orders/guest-public-order-types";
import {
  guestTrackingOrderInclude,
  type GuestTrackingOrderRecord,
} from "@/lib/orders/guest-tracking-order-include";
import { maskAddressLine, maskEmail, maskPhone } from "@/lib/orders/mask-guest-pii";

export { guestTrackingOrderInclude, type GuestTrackingOrderRecord };

export async function serializeGuestPublicOrder(
  order: GuestTrackingOrderRecord
): Promise<GuestPublicOrder> {
  const buyerEmail = order.guestEmail?.trim() || null;
  const needsWarehouse = order.vendorOrders.some(
    (vendorOrder) =>
      vendorOrder.deliveryMethod === "PICKUP" &&
      vendorOrder.vendorProfile.sellerType === "PLATFORM"
  );
  const warehouseAddress = needsWarehouse ? await getWarehouseAddress() : null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount,
    deliveryAmount: order.deliveryAmount,
    discountAmount: order.discountAmount,
    grandTotalAmount: order.grandTotalAmount,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customerName: order.shippingFullName,
    contact: {
      email: buyerEmail ? maskEmail(buyerEmail) : null,
      phone: maskPhone(order.shippingPhone),
    },
    shippingAddress: {
      fullName: order.shippingFullName,
      addressLine1: maskAddressLine(),
      city: order.shippingCity,
      country: order.shippingCountry,
      postalCode: order.shippingPostalCode || null,
    },
    vendorOrders: order.vendorOrders.map((vendorOrder) => {
      let pickupAddress: GuestPublicOrder["vendorOrders"][number]["pickupAddress"] = null;
      if (vendorOrder.deliveryMethod === "PICKUP") {
        if (vendorOrder.vendorProfile.sellerType === "PLATFORM" && warehouseAddress) {
          pickupAddress = {
            addressLine1: warehouseAddress.addressLine1,
            city: warehouseAddress.city,
            country: warehouseAddress.country,
            postalCode: warehouseAddress.postalCode || null,
          };
        } else if (vendorOrder.vendorProfile.address) {
          const address = vendorOrder.vendorProfile.address;
          pickupAddress = {
            addressLine1: address.addressLine1,
            city: address.city,
            country: address.country,
            postalCode: address.postalCode || null,
          };
        }
      }

      return {
        storeName: vendorOrder.vendorProfile.storeName,
        status: vendorOrder.status,
        deliveredAt: vendorOrder.deliveredAt?.toISOString() ?? null,
        deliveryMethod: vendorOrder.deliveryMethod,
        pickupAddress,
        trackingRef: vendorOrder.trackingRef ?? null,
        currency: vendorOrder.currency,
        subtotalAmount: vendorOrder.subtotalAmount,
        deliveryAmount: vendorOrder.deliveryAmount,
        discountAmount: vendorOrder.discountAmount,
        grandTotalAmount: vendorOrder.grandTotalAmount,
        warehouse: {
          inboundShipment: vendorOrder.inboundShipment
            ? {
                status: vendorOrder.inboundShipment.status,
                trackingRef: vendorOrder.inboundShipment.trackingRef,
                shippedAt: vendorOrder.inboundShipment.shippedAt?.toISOString() ?? null,
                receivedAt: vendorOrder.inboundShipment.receivedAt?.toISOString() ?? null,
              }
            : null,
          batch: order.consolidationBatch
            ? {
                status: order.consolidationBatch.status,
                expectedVendorCount: order.consolidationBatch.expectedVendorCount,
                receivedVendorCount: order.consolidationBatch.receivedVendorCount,
                readyToConsolidateAt:
                  order.consolidationBatch.readyToConsolidateAt?.toISOString() ?? null,
              }
            : null,
          outboundShipment: order.outboundShipment
            ? {
                status: order.outboundShipment.status,
                trackingRef: order.outboundShipment.trackingRef,
                consolidatedAt: order.outboundShipment.consolidatedAt?.toISOString() ?? null,
                shippedAt: order.outboundShipment.shippedAt?.toISOString() ?? null,
                deliveredAt: order.outboundShipment.deliveredAt?.toISOString() ?? null,
              }
            : null,
        },
        items: vendorOrder.items.map((item) => ({
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          currency: item.currency,
          unitPriceAmount: item.unitPriceAmount,
          lineTotalAmount: item.lineTotalAmount,
        })),
      };
    }),
  };
}
