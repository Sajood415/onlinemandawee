import { NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { prisma } from "@/lib/db/prisma";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
});

const pricingBodySchema = z.object({
  items: z.array(cartItemSchema).min(1),
  currency: z.string().length(3).default("USD"),
});

export const POST = withErrorHandling(async (request) => {
  const body = await request.json();
  const parsed = pricingBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const { items, currency } = parsed.data;

  const products = await Promise.all(
    items.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { vendorProfile: true, category: true },
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
      { error: { code: "UNAVAILABLE_ITEMS", message: "Some items in your cart are no longer available" } },
      { status: 400 }
    );
  }

  const subtotalAmount = products.reduce(
    (sum, { item, product }) => sum + product!.priceAmount * item.quantity,
    0
  );
  const deliveryAmount = 0;
  const grandTotalAmount = subtotalAmount + deliveryAmount;

  return NextResponse.json(
    {
      data: {
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
