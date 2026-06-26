import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

import {
  buildOrderPlacedEmail,
  buildVendorNewOrderEmail,
} from "@/lib/mail/order-status-email";

const prisma = new PrismaClient();

async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new Error("SMTP_HOST is not configured in .env.local");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Online Mandawee <noreply@onlinemandawee.com>",
    to: input.to,
    subject: input.subject,
    text: input.text,
    ...(input.html ? { html: input.html } : {}),
  });
}

async function main() {
  const orderNumber = process.argv[2];
  if (!orderNumber) {
    console.error(
      "Usage: npx dotenv -e .env.local -- node --import tsx scripts/resend-order-notifications.ts <ORDER_NUMBER>"
    );
    process.exit(1);
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber },
    include: {
      vendorOrders: {
        include: {
          vendorProfile: { include: { user: { select: { email: true, fullName: true } } } },
          items: true,
        },
      },
    },
  });

  if (!order) {
    console.error(`Order ${orderNumber} not found`);
    process.exit(1);
  }

  const snapshotRecord = order.stripePaymentIntentId
    ? await prisma.checkoutSnapshot.findUnique({
        where: { paymentIntentId: order.stripePaymentIntentId },
      })
    : null;

  const guestEmail = order.guestEmail ?? "";
  const guestName = order.shippingFullName;
  const lineItems = order.vendorOrders.flatMap((vendorOrder) =>
    vendorOrder.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount,
      currency: item.currency,
    }))
  );

  const customerEmail = buildOrderPlacedEmail(
    {
      customerName: guestName,
      orderNumber: order.orderNumber,
      trackingUrl: order.guestTrackingToken
        ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/orders/track/${order.guestTrackingToken}`
        : undefined,
      currency: order.currency,
      grandTotalAmount: order.grandTotalAmount,
      shippingAddress: {
        addressLine1: order.shippingAddressLine1,
        city: order.shippingCity,
        country: order.shippingCountry,
        postalCode: order.shippingPostalCode || undefined,
        phone: order.shippingPhone || undefined,
      },
      items: lineItems,
    },
    { paymentMethod: "card", deliveryMethod: order.deliveryMethod }
  );

  await sendMail({ to: guestEmail, ...customerEmail });
  console.log(`Customer email sent to ${guestEmail}`);

  for (const vendorOrder of order.vendorOrders) {
    const vendorEmail = vendorOrder.vendorProfile.user.email;
    if (!vendorEmail) continue;

    const vendorEmailContent = buildVendorNewOrderEmail({
      vendorName: vendorOrder.vendorProfile.user.fullName,
      storeName: vendorOrder.vendorProfile.storeName ?? "your store",
      orderNumber: order.orderNumber,
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: order.shippingPhone,
      items: vendorOrder.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        currency: item.currency,
      })),
      vendorTotalAmount: vendorOrder.grandTotalAmount,
      currency: vendorOrder.currency,
      paymentMethod: "card",
      paymentStatus: "PAID",
      shippingAddress: {
        addressLine1: order.shippingAddressLine1,
        city: order.shippingCity,
        country: order.shippingCountry,
        postalCode: order.shippingPostalCode || undefined,
        phone: order.shippingPhone || undefined,
      },
      deliveryMethod: vendorOrder.deliveryMethod,
    });

    await sendMail({ to: vendorEmail, ...vendorEmailContent });
    console.log(`Vendor email sent to ${vendorEmail}`);
  }

  if (order.stripePaymentIntentId) {
    await prisma.checkoutSnapshot.update({
      where: { paymentIntentId: order.stripePaymentIntentId },
      data: { orderId: order.id },
    });
  }

  console.log(`Done for ${orderNumber}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
