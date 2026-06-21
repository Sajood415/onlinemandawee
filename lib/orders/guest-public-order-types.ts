export type GuestPublicOrderItem = {
  productName: string;
  productImage: string | null;
  quantity: number;
  currency: string;
  unitPriceAmount: number;
  lineTotalAmount: number;
};

export type GuestPublicVendorOrder = {
  storeName: string | null;
  status: string;
  deliveredAt: string | null;
  deliveryMethod: "PICKUP" | "EXPRESS" | "STANDARD" | null;
  currency: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  warehouse: {
    inboundShipment: {
      status: "PENDING_SHIPMENT" | "INBOUND_SHIPPED" | "RECEIVED";
      trackingRef: string | null;
      shippedAt: string | null;
      receivedAt: string | null;
    } | null;
    batch: {
      status:
        | "OPEN"
        | "PARTIALLY_RECEIVED"
        | "READY_TO_CONSOLIDATE"
        | "CONSOLIDATED"
        | "OUTBOUND_SHIPPED"
        | "DELIVERED"
        | "CANCELLED";
      expectedVendorCount: number;
      receivedVendorCount: number;
      readyToConsolidateAt: string | null;
    } | null;
    outboundShipment: {
      status: "CONSOLIDATED" | "OUTBOUND_SHIPPED" | "DELIVERED";
      trackingRef: string | null;
      consolidatedAt: string | null;
      shippedAt: string | null;
      deliveredAt: string | null;
    } | null;
  };
  items: GuestPublicOrderItem[];
};

export type GuestPublicOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  contact: {
    email: string | null;
    phone: string;
  };
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string | null;
  };
  vendorOrders: GuestPublicVendorOrder[];
};

export type GuestOrderLookupResponse = {
  order: GuestPublicOrder;
  trackingToken: string | null;
};
