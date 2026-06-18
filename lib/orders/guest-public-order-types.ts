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
  currency: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  items: GuestPublicOrderItem[];
};

export type GuestPublicOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethodLabel: "cod" | "card";
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
