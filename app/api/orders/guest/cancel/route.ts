import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeRateLimit } from "@/lib/http/simple-rate-limit";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { prisma } from "@/lib/db/prisma";
import { buildOrderCancelledEmail } from "@/lib/mail/order-status-email";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";

const cancelSchema = z.object({
  orderNumber: z.string().min(1),
  guestEmail: z.string().email(),
});

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const POST = withErrorHandling(async (request) => {
  const ip = getClientIp(request);
  const limit = consumeRateLimit(`guest-cancel:${ip}`, 10, 15 * 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many cancellation attempts. Please try again later." } },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = cancelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please provide a valid order number and email." } },
      { status: 400 }
    );
  }

  const { orderNumber, guestEmail } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { vendorOrders: { include: { items: true } } },
  });

  // Generic message to prevent order number enumeration
  if (!order || order.guestEmail?.toLowerCase() !== guestEmail.toLowerCase()) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No order found with that order number and email." } },
      { status: 404 }
    );
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json(
      {
        error: {
          code: "CANNOT_CANCEL_PAID_ORDER",
          message:
            "This order has already been paid and cannot be cancelled through guest cancellation.",
        },
      },
      { status: 409 }
    );
  }

  // Can only cancel if ALL vendor orders are still NEW
  const allNew = order.vendorOrders.every((vo) => vo.status === "NEW");
  if (!allNew) {
    return NextResponse.json(
      {
        error: {
          code: "CANNOT_CANCEL",
          message:
            "This order can no longer be cancelled because it has already been accepted by the vendor.",
        },
      },
      { status: 409 }
    );
  }

  // Cancel all vendor orders and the parent order
  await prisma.$transaction([
    prisma.orderVendor.updateMany({
      where: { orderId: order.id },
      data: { status: "CANCELLED" },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    }),
  ]);

  // Send cancellation email (fire-and-forget)
  try {
    const ctx = {
      customerName: order.shippingFullName,
      orderNumber: order.orderNumber,
      grandTotalAmount: order.grandTotalAmount,
      currency: order.currency,
      shippingAddress: {
        addressLine1: order.shippingAddressLine1,
        city: order.shippingCity,
        country: order.shippingCountry,
        postalCode: order.shippingPostalCode || undefined,
        phone: order.shippingPhone || undefined,
      },
      items: order.vendorOrders.flatMap((vo) =>
        vo.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPriceAmount: item.unitPriceAmount,
          currency: item.currency,
        }))
      ),
    };
    const email = buildOrderCancelledEmail(ctx);
    await sendTransactionalEmail({ to: guestEmail, ...email });
  } catch {
    // email failure must not fail the cancel
  }

  return NextResponse.json(
    { data: { orderNumber, cancelled: true } },
    { status: 200 }
  );
});
