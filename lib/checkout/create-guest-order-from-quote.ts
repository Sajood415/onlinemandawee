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

async function generateUniqueOrderNumber() {
  for (let i = 0; i < 20; i++) {
    const candidate = `OM-${generateOpaqueToken().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const existing = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate unique order number");
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
}) {
  const orderNumber = await generateUniqueOrderNumber();
  const guestEmail = normalizeEmailForAuth(input.guestEmail);
  const guestTrackingToken = await generateUniqueGuestTrackingToken();

  const lineItemsByVendor = input.quote.lineItems.reduce<
    Record<string, typeof input.quote.lineItems>
  >((acc, item) => {
    if (!acc[item.vendorProfileId]) acc[item.vendorProfileId] = [];
    acc[item.vendorProfileId].push(item);
    return acc;
  }, {});

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
      stripePaymentIntentId: input.stripePaymentIntentId,
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
        create: input.quote.vendorSummaries.map((summary) => ({
          vendorProfileId: summary.vendorProfileId,
          status: "NEW",
          deliveryMethod: summary.deliveryMethod,
          currency: input.quote.currency,
          subtotalAmount: summary.subtotalAmount,
          deliveryAmount: summary.deliveryAmount,
          discountAmount: summary.discountAmount,
          grandTotalAmount: summary.grandTotalAmount,
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
        })),
      },
    },
  });

  const standardConsolidationService = new StandardConsolidationService();
  await standardConsolidationService.initializeForOrder(order.id);

  await incrementCouponUsage(input.quote.appliedCoupons.map((coupon) => coupon.couponId));

  const paymentMethod = "card";

  await sendGuestOrderConfirmationEmail({
    to: guestEmail,
    customerName: input.guestName,
    orderNumber: order.orderNumber,
    trackingUrl: buildGuestOrderTrackingUrl(guestTrackingToken),
    currency: input.quote.currency,
    grandTotalAmount: input.quote.grandTotalAmount,
    paymentMethod,
    shippingAddress: {
      addressLine1: input.addressLine1 ?? "",
      city: input.city ?? "",
      country: input.country ?? "",
      postalCode: (input.postalCode ?? "") || undefined,
      phone: input.guestPhone,
    },
    lineItems: input.quote.lineItems,
  });

  await sendVendorOrderNotifications({
    orderNumber: order.orderNumber,
    customerName: input.guestName,
    customerEmail: guestEmail,
    customerPhone: input.guestPhone,
    currency: input.quote.currency,
    paymentMethod,
    paymentStatus: input.paymentStatus,
    shippingAddress: {
      addressLine1: input.addressLine1 ?? "",
      city: input.city ?? "",
      country: input.country ?? "",
      postalCode: (input.postalCode ?? "") || undefined,
      phone: input.guestPhone,
    },
    vendorGroups: input.quote.vendorSummaries.map((summary) => ({
      vendorProfileId: summary.vendorProfileId,
      grandTotalAmount: summary.grandTotalAmount,
      items: (lineItemsByVendor[summary.vendorProfileId] ?? []).map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        currency: item.currency,
      })),
    })),
  });

  return order;
}

export { buildGuestCheckoutQuote };
