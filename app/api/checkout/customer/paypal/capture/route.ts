import { NextResponse } from "next/server";
import { z } from "zod";

import { finalizePaidPaypalCheckout } from "@/lib/checkout/finalize-paid-paypal-checkout";
import {
  assertPayPalOrderPaid,
  capturePayPalOrder,
  getPayPalOrder,
} from "@/lib/paypal/checkout-payment";
import { isPayPalConfigured } from "@/lib/paypal/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CheckoutSnapshotRepository } from "@/repositories/checkout-snapshot.repository";

const bodySchema = z.object({
  paypalOrderId: z.string().min(1),
  checkoutContextToken: z.string().min(1),
});

const checkoutSnapshotRepository = new CheckoutSnapshotRepository();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: { code: "CONFIG_ERROR", message: "PayPal is not configured." } },
        { status: 503 }
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
        { status: 400 }
      );
    }

    const snapshot = await checkoutSnapshotRepository.findByPaymentIntentId(
      parsed.data.paypalOrderId
    );
    if (!snapshot?.snapshot || typeof snapshot.snapshot !== "object") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Checkout session not found" } },
        { status: 404 }
      );
    }

    const snap = snapshot.snapshot as Record<string, unknown>;
    const quote = snap.quote as { grandTotalAmount: number; currency: string };
    const metadata =
      (snap.paypalMetadata as Record<string, string> | undefined) ?? {
        source: "customer_checkout",
        checkoutContextHash: snapshot.checkoutContextHash,
        checkoutCustomerUserId: context.auth.id,
      };

    let orderResource = await getPayPalOrder(parsed.data.paypalOrderId);
    if (orderResource.status !== "COMPLETED") {
      orderResource = await capturePayPalOrder(parsed.data.paypalOrderId);
    }

    const paid = assertPayPalOrderPaid(orderResource, {
      amountMinor: quote.grandTotalAmount,
      currency: quote.currency,
    });

    const order = await finalizePaidPaypalCheckout({
      paypalOrderId: parsed.data.paypalOrderId,
      paypalCaptureId: paid.captureId,
      amountMinor: paid.amountMinor,
      currency: paid.currency,
      source: "customer_checkout",
      checkoutContextToken: parsed.data.checkoutContextToken,
      authenticatedUserId: context.auth.id,
      metadata: {
        ...metadata,
        source: "customer_checkout",
        checkoutCustomerUserId: context.auth.id,
      },
    });

    return NextResponse.json(
      {
        data: {
          orderNumber: order.orderNumber,
          orderId: order.id,
        },
      },
      { status: 201 }
    );
  })
);
