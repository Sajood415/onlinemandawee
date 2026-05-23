import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { prisma } from "@/lib/db/prisma";
import { sendGuestOrderConfirmationEmail } from "@/lib/mail/send-guest-order-confirmation-email";
import { sendVendorOrderNotifications } from "@/lib/mail/send-vendor-order-notifications";
import { generateOpaqueToken } from "@/lib/utils/crypto";

const lineItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  productImage: z.string().nullable().optional(),
  productSku: z.string().nullable().optional(),
  vendorProfileId: z.string().min(1),
  categoryId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPriceAmount: z.number().int().min(0),
  lineTotalAmount: z.number().int().min(0),
  currency: z.string().length(3),
});

const confirmBodySchema = z.object({
  paymentIntentId: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(1),
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  postalCode: z.string().default(""),
  currency: z.string().length(3),
  subtotalAmount: z.number().int().min(0),
  deliveryAmount: z.number().int().min(0),
  grandTotalAmount: z.number().int().min(0),
  lineItems: z.array(lineItemSchema).min(1),
});

async function generateUniqueOrderNumber(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = `OM-${generateOpaqueToken().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const existing = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate unique order number");
}

export const POST = withErrorHandling(async (request) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Stripe is not configured." } },
      { status: 503 }
    );
  }
  const stripe = new Stripe(stripeSecretKey);

  const body = await request.json();
  const parsed = confirmBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // Verify the payment intent was paid
  const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_NOT_COMPLETED",
          message: "Payment has not been completed",
        },
      },
      { status: 400 }
    );
  }

  // Idempotency: check if an order already exists for this payment intent
  const existingOrder = await prisma.order.findFirst({
    where: { stripePaymentIntentId: input.paymentIntentId },
  });

  if (existingOrder) {
    return NextResponse.json(
      { data: { orderNumber: existingOrder.orderNumber } },
      { status: 200 }
    );
  }

  // Group line items by vendor
  const vendorGroups = Object.values(
    input.lineItems.reduce<
      Record<
        string,
        {
          vendorProfileId: string;
          subtotalAmount: number;
          items: typeof input.lineItems;
        }
      >
    >((acc, item) => {
      if (!acc[item.vendorProfileId]) {
        acc[item.vendorProfileId] = {
          vendorProfileId: item.vendorProfileId,
          subtotalAmount: 0,
          items: [],
        };
      }
      acc[item.vendorProfileId].subtotalAmount += item.lineTotalAmount;
      acc[item.vendorProfileId].items.push(item);
      return acc;
    }, {})
  );

  const orderNumber = await generateUniqueOrderNumber();

  const order = await prisma.order.create({
    data: {
      guestEmail: input.guestEmail,
      stripePaymentIntentId: input.paymentIntentId,
      orderNumber,
      status: "CREATED",
      paymentStatus: "PAID",
      currency: input.currency,
      subtotalAmount: input.subtotalAmount,
      deliveryAmount: input.deliveryAmount,
      discountAmount: 0,
      grandTotalAmount: input.grandTotalAmount,
      shippingFullName: input.guestName,
      shippingPhone: input.guestPhone,
      shippingAddressLine1: input.addressLine1,
      shippingCity: input.city,
      shippingCountry: input.country,
      shippingPostalCode: input.postalCode,
      vendorOrders: {
        create: vendorGroups.map((group) => ({
          vendorProfileId: group.vendorProfileId,
          status: "NEW",
          currency: input.currency,
          subtotalAmount: group.subtotalAmount,
          deliveryAmount: 0,
          discountAmount: 0,
          grandTotalAmount: group.subtotalAmount,
          items: {
            create: group.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              currency: item.currency,
              unitPriceAmount: item.unitPriceAmount,
              lineTotalAmount: item.lineTotalAmount,
              productName: item.productName,
              productImage: item.productImage ?? null,
              productSku: item.productSku ?? null,
              vendorProfileId: item.vendorProfileId,
              categoryId: item.categoryId,
            })),
          },
        })),
      },
    },
  });

  await sendGuestOrderConfirmationEmail({
    to: input.guestEmail,
    customerName: input.guestName,
    orderNumber: order.orderNumber,
    currency: input.currency,
    grandTotalAmount: input.grandTotalAmount,
    paymentMethod: "card",
    shippingAddress: {
      addressLine1: input.addressLine1,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode || undefined,
      phone: input.guestPhone,
    },
    lineItems: input.lineItems,
  });

  await sendVendorOrderNotifications({
    orderNumber: order.orderNumber,
    customerName: input.guestName,
    customerEmail: input.guestEmail,
    customerPhone: input.guestPhone,
    currency: input.currency,
    paymentMethod: "card",
    paymentStatus: "PAID",
    shippingAddress: {
      addressLine1: input.addressLine1,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode || undefined,
      phone: input.guestPhone,
    },
    vendorGroups: vendorGroups.map((group) => ({
      vendorProfileId: group.vendorProfileId,
      grandTotalAmount: group.subtotalAmount,
      items: group.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        currency: item.currency,
      })),
    })),
  });

  return NextResponse.json(
    { data: { orderNumber: order.orderNumber, orderId: order.id } },
    { status: 201 }
  );
});
