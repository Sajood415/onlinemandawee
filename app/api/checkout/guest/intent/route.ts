import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { prisma } from "@/lib/db/prisma";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
});

const intentBodySchema = z.object({
  items: z.array(cartItemSchema).min(1),
  currency: z.string().length(3).default("USD"),
});

export const POST = withErrorHandling(async (request) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment." } },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);

  const body = await request.json();
  const parsed = intentBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const { items, currency } = parsed.data;

  // Fetch product details from DB to get real prices
  const products = await Promise.all(
    items.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          vendorProfile: true,
          category: true,
        },
      });
      return { item, product };
    })
  );

  const unavailable = products.filter(
    ({ product }) =>
      !product ||
      product.approvalStatus !== "APPROVED" ||
      !product.isActive ||
      product.vendorProfile.status !== "ACTIVE"
  );

  if (unavailable.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "UNAVAILABLE_ITEMS",
          message: "Some items in your cart are no longer available",
        },
      },
      { status: 400 }
    );
  }

  // Calculate total in smallest currency unit (cents)
  const subtotalAmount = products.reduce(
    (sum, { item, product }) => sum + product!.priceAmount * item.quantity,
    0
  );

  const deliveryAmount = 0; // flat free delivery for guest checkout
  const grandTotalAmount = subtotalAmount + deliveryAmount;

  // Minimum Stripe charge is 50 cents
  if (grandTotalAmount < 50) {
    return NextResponse.json(
      { error: { code: "AMOUNT_TOO_LOW", message: "Order total is too low" } },
      { status: 400 }
    );
  }

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: grandTotalAmount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: "guest_checkout",
        itemCount: String(items.length),
      },
    });
  } catch (err) {
    const stripeErr = err as { type?: string; message?: string };
    const msg =
      stripeErr.type === "StripeAuthenticationError"
        ? "Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local."
        : (stripeErr.message ?? "Stripe error. Please try again.");
    return NextResponse.json(
      { error: { code: "STRIPE_ERROR", message: msg } },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        subtotalAmount,
        deliveryAmount,
        grandTotalAmount,
        currency,
        lineItems: products.map(({ item, product }) => ({
          productId: item.productId,
          productName: product!.name,
          productImage: product!.images[0] ?? null,
          productSku: product!.sku ?? null,
          vendorProfileId: product!.vendorProfileId,
          categoryId: product!.categoryId,
          quantity: item.quantity,
          unitPriceAmount: product!.priceAmount,
          lineTotalAmount: product!.priceAmount * item.quantity,
          currency: product!.currency,
        })),
      },
    },
    { status: 200 }
  );
});
