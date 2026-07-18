import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  buildGuestCheckoutQuote,
  incrementCouponUsage,
  type GuestCheckoutQuote,
} from "@/lib/checkout/build-guest-checkout-quote";
import { decrementStockForOrderItems } from "@/lib/inventory/decrement-order-stock";
import { sendGuestOrderConfirmationEmail } from "@/lib/mail/send-guest-order-confirmation-email";
import { sendVendorOrderNotifications } from "@/lib/mail/send-vendor-order-notifications";
import { buildGuestOrderTrackingUrl } from "@/lib/orders/build-order-tracking-url";
import { generateUniqueGuestTrackingToken } from "@/lib/orders/generate-guest-tracking-token";
import { generateOpaqueToken } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { StandardConsolidationService } from "@/services/standard-consolidation.service";
import { mergeLineItemsByProduct } from "@/lib/orders/aggregate-order-line-items";
import { resolveVendorSettlementDeliveryAmount } from "@/lib/delivery/vendor-settlement-delivery";

async function generateUniqueOrderNumber() {
  for (let i = 0; i < 20; i++) {
    const candidate = `OM-${generateOpaqueToken().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const existing = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate unique order number");
}

function groupLineItemsByVendor(quote: GuestCheckoutQuote) {
  const lineItemsByVendor = quote.lineItems.reduce<
    Record<string, typeof quote.lineItems>
  >((acc, item) => {
    if (!acc[item.vendorProfileId]) acc[item.vendorProfileId] = [];
    acc[item.vendorProfileId].push(item);
    return acc;
  }, {});

  for (const vendorProfileId of Object.keys(lineItemsByVendor)) {
    lineItemsByVendor[vendorProfileId] = mergeLineItemsByProduct(
      lineItemsByVendor[vendorProfileId] ?? []
    );
  }

  return lineItemsByVendor;
}

export async function sendGuestCheckoutOrderNotifications(input: {
  orderId: string;
  quote: GuestCheckoutQuote;
  orderNumber: string;
  guestTrackingToken: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  paymentStatus: "PAID";
  deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD";
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      vendorOrders: {
        include: { items: true },
      },
    },
  });
  if (!order) {
    return;
  }

  const guestEmail = normalizeEmailForAuth(input.guestEmail);
  const paymentMethod = "card";
  const customerLineItems = order.vendorOrders.flatMap((vendorOrder) =>
    vendorOrder.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount,
      currency: item.currency,
    }))
  );

  await sendGuestOrderConfirmationEmail({
    to: guestEmail,
    customerName: input.guestName,
    orderNumber: input.orderNumber,
    trackingUrl: buildGuestOrderTrackingUrl(input.guestTrackingToken),
    currency: order.currency,
    grandTotalAmount: order.grandTotalAmount,
    paymentMethod,
    deliveryMethod:
      input.deliveryMethod ?? order.deliveryMethod ?? input.quote.deliveryMethod ?? "STANDARD",
    shippingAddress: {
      addressLine1: input.addressLine1 ?? "",
      city: input.city ?? "",
      country: input.country ?? "",
      postalCode: (input.postalCode ?? "") || undefined,
      phone: input.guestPhone,
    },
    lineItems: customerLineItems,
  });

  await sendVendorOrderNotifications({
    orderNumber: input.orderNumber,
    customerName: input.guestName,
    customerEmail: guestEmail,
    customerPhone: input.guestPhone,
    currency: order.currency,
    paymentMethod,
    paymentStatus: input.paymentStatus,
    shippingAddress: {
      addressLine1: input.addressLine1 ?? "",
      city: input.city ?? "",
      country: input.country ?? "",
      postalCode: (input.postalCode ?? "") || undefined,
      phone: input.guestPhone,
    },
    vendorGroups: order.vendorOrders.map((vendorOrder) => ({
      vendorProfileId: vendorOrder.vendorProfileId,
      grandTotalAmount: vendorOrder.grandTotalAmount,
      deliveryMethod: vendorOrder.deliveryMethod,
      items: vendorOrder.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        currency: item.currency,
      })),
    })),
  });
}

export async function createGuestOrderFromQuote(input: {
  quote: GuestCheckoutQuote;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  paymentStatus: "PAID";
  deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD";
  stripePaymentIntentId?: string;
  userId?: string;
  sendNotifications?: boolean;
}) {
  const sendNotifications = input.sendNotifications !== false;
  const orderNumber = await generateUniqueOrderNumber();
  const guestEmail = normalizeEmailForAuth(input.guestEmail);
  const guestTrackingToken = await generateUniqueGuestTrackingToken();

  const lineItemsByVendor = groupLineItemsByVendor(input.quote);

  await decrementStockForOrderItems(
    input.quote.lineItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      variantId: item.variantId,
    }))
  );

  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      guestEmail,
      guestTrackingToken,
      stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
      orderNumber,
      status: "CREATED",
      paymentStatus: input.paymentStatus,
      deliveryMethod: input.deliveryMethod ?? input.quote.deliveryMethod ?? "STANDARD",
      currency: input.quote.currency,
      subtotalAmount: input.quote.subtotalAmount,
      deliveryAmount: input.quote.deliveryAmount,
      discountAmount: input.quote.discountAmount,
      grandTotalAmount: input.quote.grandTotalAmount,
      shippingFullName: input.guestName,
      shippingPhone: input.guestPhone,
      shippingAddressLine1: input.addressLine1 ?? "",
      shippingCity: input.city ?? "",
      shippingCountry: input.country ?? "",
      shippingPostalCode: input.postalCode ?? "",
      vendorOrders: {
        create: input.quote.vendorSummaries.map((summary) => {
          const deliveryAmount = resolveVendorSettlementDeliveryAmount({
            deliveryMethod: summary.deliveryMethod,
            quotedDeliveryAmount: summary.deliveryAmount,
            sellerType: summary.sellerType,
          });
          return {
            vendorProfileId: summary.vendorProfileId,
            status: "NEW",
            deliveryMethod: summary.deliveryMethod,
            currency: input.quote.currency,
            subtotalAmount: summary.subtotalAmount,
            deliveryAmount,
            discountAmount: summary.discountAmount,
            grandTotalAmount: Math.max(
              0,
              summary.subtotalAmount + deliveryAmount - summary.discountAmount
            ),
            couponCode: summary.couponCode,
            items: {
              create: (lineItemsByVendor[summary.vendorProfileId] ?? []).map((item) => ({
                productId: item.productId,
                variantId: item.variantId ?? null,
                variantName: item.variantName ?? null,
                quantity: item.quantity,
                currency: item.currency,
                unitPriceAmount: item.unitPriceAmount,
                lineTotalAmount: item.lineTotalAmount,
                productName: item.productName,
                productImage: item.productImage,
                productSku: item.productSku,
                vendorProfileId: item.vendorProfileId,
                categoryId: item.categoryId,
              })),
            },
          };
        }),
      },
    },
  });

  const standardConsolidationService = new StandardConsolidationService();
  await standardConsolidationService.initializeForOrder(order.id);

  await incrementCouponUsage(input.quote.appliedCoupons.map((coupon) => coupon.couponId));

  if (!sendNotifications) {
    return order;
  }

  await sendGuestCheckoutOrderNotifications({
    orderId: order.id,
    quote: input.quote,
    orderNumber: order.orderNumber,
    guestTrackingToken,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    addressLine1: input.addressLine1,
    city: input.city,
    country: input.country,
    postalCode: input.postalCode,
    paymentStatus: input.paymentStatus,
    deliveryMethod: input.deliveryMethod,
  });

  return order;
}

export { buildGuestCheckoutQuote };
