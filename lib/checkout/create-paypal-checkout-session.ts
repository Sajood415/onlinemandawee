import "server-only";

import {
  buildGuestCheckoutQuote,
  type GuestCheckoutQuote,
} from "@/lib/checkout/build-guest-checkout-quote";
import { resolveCheckoutShippingAddress } from "@/lib/checkout/resolve-checkout-shipping-address";
import type { PostalAddress } from "@/lib/maps/google-maps";
import { createPayPalOrder } from "@/lib/paypal/checkout-payment";
import { assertPayPalConfigured } from "@/lib/paypal/server";
import { generateOpaqueToken, sha256 } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { CheckoutSnapshotRepository } from "@/repositories/checkout-snapshot.repository";

const checkoutSnapshotRepository = new CheckoutSnapshotRepository();

type ShippingContact = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
};

type CreatePaypalCheckoutSessionInput = {
  source: "guest_checkout" | "customer_checkout";
  userId?: string;
  items: Array<{ productId: string; quantity: number; variantId?: string }>;
  currency: string;
  couponCodes?: string[];
  vendorCoupons?: Array<{ vendorProfileId: string; code: string }>;
  deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD";
  deliveryAddress?: PostalAddress;
  contact: ShippingContact;
  shipping?: {
    addressLine1?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };
  checkoutGuestEmail?: string;
};

export async function createPaypalCheckoutSession(input: CreatePaypalCheckoutSessionInput) {
  assertPayPalConfigured();

  const quote: GuestCheckoutQuote = await buildGuestCheckoutQuote({
    items: input.items,
    currency: input.currency,
    couponCodes: input.couponCodes,
    vendorCoupons: input.vendorCoupons,
    deliveryMethod: input.deliveryMethod,
    deliveryAddress: input.deliveryAddress,
  });

  const checkoutContextToken = generateOpaqueToken();
  const checkoutContextHash = sha256(checkoutContextToken);
  const checkoutGuestEmailHash = input.checkoutGuestEmail
    ? sha256(normalizeEmailForAuth(input.checkoutGuestEmail))
    : input.source === "guest_checkout"
      ? sha256(normalizeEmailForAuth(input.contact.guestEmail))
      : "";

  const metadata: Record<string, string> = {
    source: input.source,
    itemCount: String(input.items.length),
    couponCount: String(quote.appliedCoupons.length),
    checkoutContextHash,
    checkoutGuestEmailHash,
    checkoutCurrency: quote.currency,
    grandTotalAmount: String(quote.grandTotalAmount),
  };
  if (input.userId) {
    metadata.checkoutCustomerUserId = input.userId;
  }

  const invoiceId = `chk_${checkoutContextHash.slice(0, 24)}_${Date.now()}`;
  const paypalOrder = await createPayPalOrder({
    amountMinor: quote.grandTotalAmount,
    currency: quote.currency,
    customId: checkoutContextHash,
    description: `Mandawee order (${input.source})`,
    invoiceId,
  });

  const shippingAddress = resolveCheckoutShippingAddress({
    deliveryAddress: input.deliveryAddress
      ? {
          addressLine1: input.deliveryAddress.addressLine1,
          city: input.deliveryAddress.city,
          country: input.deliveryAddress.country,
          postalCode: input.deliveryAddress.postalCode ?? undefined,
        }
      : undefined,
    addressLine1: input.shipping?.addressLine1,
    city: input.shipping?.city,
    country: input.shipping?.country,
    postalCode: input.shipping?.postalCode,
  });

  await checkoutSnapshotRepository.createIfAbsent({
    paymentIntentId: paypalOrder.id,
    source: input.source,
    userId: input.userId,
    checkoutContextHash,
    checkoutGuestEmailHash: checkoutGuestEmailHash || undefined,
    snapshot: {
      quote,
      guestName: input.contact.guestName,
      guestEmail: input.contact.guestEmail,
      guestPhone: input.contact.guestPhone,
      addressLine1: shippingAddress.addressLine1,
      city: shippingAddress.city,
      country: shippingAddress.country,
      postalCode: shippingAddress.postalCode,
      deliveryMethod: input.deliveryMethod ?? quote.deliveryMethod,
      paymentProvider: "PAYPAL",
      paypalMetadata: metadata,
    },
  });

  return {
    paypalOrderId: paypalOrder.id,
    checkoutContextToken,
    quote,
    metadata,
  };
}
