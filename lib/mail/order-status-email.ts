export type OrderEmailContext = {
  customerName: string;
  orderNumber: string;
  trackingUrl?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPriceAmount: number;
    currency: string;
  }>;
  grandTotalAmount: number;
  currency: string;
  shippingAddress: {
    addressLine1: string;
    city: string;
    country: string;
    postalCode?: string;
    phone?: string;
  };
};

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function baseLayout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
    .header { background: #0f3460; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.3px; }
    .header p { color: rgba(255,255,255,.7); margin: 6px 0 0; font-size: 13px; }
    .body { padding: 32px 40px; }
    .badge { display: inline-block; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 999px; padding: 4px 14px; font-size: 12px; font-weight: 600; letter-spacing: .3px; margin-bottom: 20px; }
    .badge.blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    h2 { margin: 0 0 8px; font-size: 20px; color: #0f172a; }
    p { margin: 0 0 16px; font-size: 14px; color: #64748b; line-height: 1.6; }
    .order-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .order-box .label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 4px; }
    .order-box .value { font-size: 16px; font-weight: 700; color: #0f3460; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: left; }
    td { font-size: 13px; color: #334155; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    td:last-child { text-align: right; font-weight: 600; color: #0f172a; }
    .total-row td { font-weight: 700; font-size: 14px; color: #0f3460; border-bottom: none; padding-top: 14px; }
    .address-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; font-size: 13px; color: #334155; line-height: 1.7; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Online Mandawee</h1>
      <p>Your trusted marketplace</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Online Mandawee. All rights reserved.</p>
      <p style="margin-top:4px">If you have questions, reply to this email or contact our support team.</p>
    </div>
  </div>
</body>
</html>`;
}

function itemsTable(ctx: OrderEmailContext) {
  const rows = ctx.items
    .map(
      (item) => `
    <tr>
      <td>${item.productName}</td>
      <td style="text-align:center;color:#64748b">× ${item.quantity}</td>
      <td>${formatCurrency(item.unitPriceAmount * item.quantity, item.currency)}</td>
    </tr>`
    )
    .join("");
  return `
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="2">Order Total</td>
          <td>${formatCurrency(ctx.grandTotalAmount, ctx.currency)}</td>
        </tr>
      </tbody>
    </table>`;
}

function addressBlock(ctx: OrderEmailContext) {
  const { addressLine1, city, country, postalCode, phone } = ctx.shippingAddress;
  return `<div class="address-box">
    <strong>${ctx.customerName}</strong><br/>
    ${addressLine1}<br/>
    ${city}${postalCode ? `, ${postalCode}` : ""}<br/>
    ${country}${phone ? `<br/>${phone}` : ""}
  </div>`;
}

function trackingCta(trackingUrl?: string) {
  if (!trackingUrl) return "";
  return `
    <p style="margin-top:24px;text-align:center">
      <a href="${trackingUrl}" style="display:inline-block;background:#0f3460;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px">
        Track Your Order
      </a>
    </p>
    <p style="margin-top:12px;font-size:12px;color:#94a3b8;text-align:center">
      You can use this secure link anytime to check your latest order status.
    </p>`;
}

function trackingTextLine(trackingUrl?: string) {
  return trackingUrl ? `\nTrack your order: ${trackingUrl}\n` : "";
}

export function buildOrderPlacedEmail(
  ctx: OrderEmailContext,
  options: { paymentMethod: "card"; deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD" | null }
) {
  const paymentNote =
    "Payment: <strong>Paid by card</strong>. Your payment was processed successfully.";

  const standardDeliveryNote =
    options.deliveryMethod === "STANDARD"
      ? `<p style="margin-top:16px;padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;font-size:13px;color:#334155;line-height:1.6">
      <strong>Standard delivery:</strong> sellers ship to our warehouse first. We'll email you when items arrive,
      when your order is packed, when it ships to you, and when it's delivered.
    </p>`
      : "";

  const followUpLine =
    options.deliveryMethod === "STANDARD"
      ? "We'll email you as your order moves through our warehouse and out for delivery."
      : "We will email you again when it ships.";

  const body = `
    <span class="badge">✅ Order Confirmed</span>
    <h2>Thank you, ${ctx.customerName}!</h2>
    <p>We have received your order and ${followUpLine.toLowerCase()}</p>

    <div class="order-box">
      <div class="label">Order Number</div>
      <div class="value">${ctx.orderNumber}</div>
    </div>

    ${itemsTable(ctx)}

    <p style="margin-top:20px;font-size:13px;color:#64748b;font-weight:600">Delivering to:</p>
    ${addressBlock(ctx)}

    <p style="margin-top:20px">${paymentNote}</p>
    ${standardDeliveryNote}
    ${trackingCta(ctx.trackingUrl)}
  `;

  const paymentText = "Payment: Paid by card.";

  return {
    subject: `Order confirmed — ${ctx.orderNumber}`,
    html: baseLayout(`Order Confirmed — ${ctx.orderNumber}`, body),
    text: [
      `Hi ${ctx.customerName},`,
      "",
      `Thank you for your order ${ctx.orderNumber}.`,
      `Total: ${formatCurrency(ctx.grandTotalAmount, ctx.currency)}.`,
      paymentText,
      "",
      followUpLine,
      trackingTextLine(ctx.trackingUrl),
    ].join("\n"),
  };
}

export type VendorOrderEmailContext = {
  vendorName: string;
  storeName: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderEmailContext["items"];
  vendorTotalAmount: number;
  currency: string;
  paymentMethod: "card";
  paymentStatus: "PAID" | "UNPAID";
  shippingAddress: OrderEmailContext["shippingAddress"];
  deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD" | null;
};

export function buildVendorNewOrderEmail(ctx: VendorOrderEmailContext) {
  const itemsCtx: OrderEmailContext = {
    customerName: ctx.customerName,
    orderNumber: ctx.orderNumber,
    items: ctx.items,
    grandTotalAmount: ctx.vendorTotalAmount,
    currency: ctx.currency,
    shippingAddress: ctx.shippingAddress,
  };

  const paymentNote =
    ctx.paymentStatus === "PAID"
      ? "Payment: <strong>Paid by card</strong> — payment has been received."
      : "Payment: <strong>Pending</strong> — payment has not been collected yet.";

  const customerContact = [
    ctx.customerEmail ? `<strong>Email:</strong> ${ctx.customerEmail}` : null,
    ctx.customerPhone ? `<strong>Phone:</strong> ${ctx.customerPhone}` : null,
  ]
    .filter(Boolean)
    .join("<br/>");

  const body = `
    <span class="badge blue">🛒 New Order</span>
    <h2>You have a new order, ${ctx.vendorName}!</h2>
    <p>A customer just placed an order for <strong>${ctx.storeName}</strong>. Review the details below and accept it from your vendor portal.</p>

    <div class="order-box">
      <div class="label">Order Number</div>
      <div class="value">${ctx.orderNumber}</div>
    </div>

    <p style="margin-top:20px;font-size:13px;color:#64748b;font-weight:600">Customer:</p>
    <div class="address-box">
      <strong>${ctx.customerName}</strong><br/>
      ${customerContact}
    </div>

    ${itemsTable(itemsCtx)}

    <p style="margin-top:20px;font-size:13px;color:#64748b;font-weight:600">Deliver to:</p>
    ${addressBlock(itemsCtx)}

    <p style="margin-top:20px">${paymentNote}</p>
    ${
      ctx.deliveryMethod === "STANDARD"
        ? `<div style="margin-top:20px;padding:16px 18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1d4ed8">Standard delivery — ship to warehouse</p>
      <p style="margin:0;font-size:13px;color:#334155;line-height:1.6">
        This is a <strong>standard consolidated</strong> order. Pack the items and use
        <strong>Send to warehouse</strong> in your vendor orders page with a tracking / AWB reference.
        Admin will receive the goods, consolidate with other vendors, then ship to the customer.
      </p>
    </div>`
        : ""
    }
    <p style="margin-top:12px">Sign in to your vendor dashboard to accept and fulfil this order.</p>
  `;

  const paymentText =
    ctx.paymentStatus === "PAID"
      ? "Payment: Paid by card."
      : "Payment: Pending.";

  return {
    subject: `New order ${ctx.orderNumber} — ${ctx.storeName}`,
    html: baseLayout(`New Order — ${ctx.orderNumber}`, body),
    text: [
      `Hi ${ctx.vendorName},`,
      "",
      `You have a new order ${ctx.orderNumber} for ${ctx.storeName}.`,
      `Customer: ${ctx.customerName}${ctx.customerEmail ? ` (${ctx.customerEmail})` : ""}`,
      `Your total: ${formatCurrency(ctx.vendorTotalAmount, ctx.currency)}.`,
      paymentText,
      "",
      ctx.deliveryMethod === "STANDARD"
        ? "Standard delivery: ship items to the platform warehouse from Vendor Orders → Send to warehouse (include tracking/AWB)."
        : "",
      "",
      "Sign in to your vendor dashboard to accept and fulfil this order.",
    ].join("\n"),
  };
}

export function buildOrderShippedEmail(
  ctx: OrderEmailContext,
  options?: { trackingRef?: string | null; standardDelivery?: boolean }
) {
  const trackingRefBlock = options?.trackingRef
    ? `<p style="margin-top:16px">Tracking reference: <strong>${options.trackingRef}</strong></p>`
    : "";

  const intro = options?.standardDelivery
    ? "Your consolidated standard-delivery order has left our warehouse and is <strong>on its way to you</strong>."
    : "Your order has been <strong>shipped</strong> and is on its way to you. Keep an eye out for your delivery!";

  const body = `
    <span class="badge blue">🚚 Your order is on its way!</span>
    <h2>Great news, ${ctx.customerName}!</h2>
    <p>${intro}</p>

    <div class="order-box">
      <div class="label">Order Number</div>
      <div class="value">${ctx.orderNumber}</div>
    </div>

    ${trackingRefBlock}

    ${itemsTable(ctx)}

    <p style="margin-top:20px;font-size:13px;color:#64748b;font-weight:600">Delivering to:</p>
    ${addressBlock(ctx)}

    ${trackingCta(ctx.trackingUrl)}

    <p style="margin-top:20px">Thank you for shopping with us. We hope you enjoy your order!</p>
  `;

  const trackingRefText = options?.trackingRef ? `\nTracking reference: ${options.trackingRef}\n` : "";

  return {
    subject: `Your order ${ctx.orderNumber} is on its way! 🚚`,
    html: baseLayout(`Order Shipped — ${ctx.orderNumber}`, body),
    text: `Hi ${ctx.customerName}, your order ${ctx.orderNumber} has been shipped and is on the way! Total: ${formatCurrency(ctx.grandTotalAmount, ctx.currency)}.${trackingRefText}${trackingTextLine(ctx.trackingUrl)}`,
  };
}

export function buildStandardWarehousePartialEmail(
  ctx: OrderEmailContext,
  input: { receivedVendorCount: number; expectedVendorCount: number }
) {
  const body = `
    <span class="badge blue">📦 Warehouse update</span>
    <h2>Items arriving at our warehouse, ${ctx.customerName}</h2>
    <p>
      We've received items from one of the sellers on your standard-delivery order at the
      <strong>Mandawee warehouse</strong>. We're waiting for the remaining seller shipments before packing your order.
    </p>

    <div class="order-box">
      <div class="label">Order Number</div>
      <div class="value">${ctx.orderNumber}</div>
      <p style="margin:12px 0 0;font-size:13px;color:#64748b">
        Seller shipments received: <strong>${input.receivedVendorCount} of ${input.expectedVendorCount}</strong>
      </p>
    </div>

    ${itemsTable(ctx)}

    ${trackingCta(ctx.trackingUrl)}

    <p style="margin-top:20px">We'll email you again when all items are at the warehouse and when your order ships to you.</p>
  `;

  return {
    subject: `Warehouse update — ${ctx.orderNumber}`,
    html: baseLayout(`Warehouse Update — ${ctx.orderNumber}`, body),
    text: [
      `Hi ${ctx.customerName},`,
      "",
      `We've received part of your order ${ctx.orderNumber} at our warehouse.`,
      `Seller shipments received: ${input.receivedVendorCount} of ${input.expectedVendorCount}.`,
      "We'll notify you when everything is ready to ship.",
      trackingTextLine(ctx.trackingUrl),
    ].join("\n"),
  };
}

export function buildStandardWarehouseReadyEmail(ctx: OrderEmailContext) {
  const body = `
    <span class="badge blue">📦 Ready to ship</span>
    <h2>All items are at our warehouse, ${ctx.customerName}!</h2>
    <p>
      Every seller shipment for your standard-delivery order has arrived at the
      <strong>Mandawee warehouse</strong>. We're now packing your order for delivery to you.
    </p>

    <div class="order-box">
      <div class="label">Order Number</div>
      <div class="value">${ctx.orderNumber}</div>
    </div>

    ${itemsTable(ctx)}

    <p style="margin-top:20px;font-size:13px;color:#64748b;font-weight:600">Delivering to:</p>
    ${addressBlock(ctx)}

    ${trackingCta(ctx.trackingUrl)}

    <p style="margin-top:20px">We'll send another email with tracking details when your package leaves our warehouse.</p>
  `;

  return {
    subject: `Your order ${ctx.orderNumber} is being packed for delivery`,
    html: baseLayout(`Order at Warehouse — ${ctx.orderNumber}`, body),
    text: [
      `Hi ${ctx.customerName},`,
      "",
      `All items for order ${ctx.orderNumber} are at our warehouse and being packed for delivery.`,
      trackingTextLine(ctx.trackingUrl),
    ].join("\n"),
  };
}

export function buildOrderDeliveredEmail(ctx: OrderEmailContext) {
  const body = `
    <span class="badge">✅ Order Delivered</span>
    <h2>Your order has arrived, ${ctx.customerName}!</h2>
    <p>We're happy to let you know that your order has been <strong>delivered</strong>. We hope you love what you ordered!</p>

    <div class="order-box">
      <div class="label">Order Number</div>
      <div class="value">${ctx.orderNumber}</div>
    </div>

    ${itemsTable(ctx)}

    ${trackingCta(ctx.trackingUrl)}

    <p style="margin-top:20px">Thank you for choosing <strong>Online Mandawee</strong>. We look forward to serving you again!</p>
  `;
  return {
    subject: `Your order ${ctx.orderNumber} has been delivered! ✅`,
    html: baseLayout(`Order Delivered — ${ctx.orderNumber}`, body),
    text: `Hi ${ctx.customerName}, your order ${ctx.orderNumber} has been delivered. Thank you for shopping with us!${trackingTextLine(ctx.trackingUrl)}`,
  };
}

export function buildOrderPickupReadyEmail(
  ctx: OrderEmailContext,
  input: { storeName?: string | null; pickupAddress?: string | null }
) {
  const storeLine = input.storeName
    ? `<p style="margin-top:16px"><strong>Pickup store:</strong> ${input.storeName}</p>`
    : "";
  const pickupAddressBlock = input.pickupAddress
    ? `<p style="margin-top:8px"><strong>Pickup location:</strong><br/>${input.pickupAddress}</p>`
    : `<p style="margin-top:8px"><strong>Pickup location:</strong> We will confirm your pickup address shortly.</p>`;

  const body = `
    <span class="badge blue">📍 Ready for pickup</span>
    <h2>Your order is ready for pickup, ${ctx.customerName}!</h2>
    <p>Your pickup order is now prepared and ready to collect.</p>

    <div class="order-box">
      <div class="label">Order Number</div>
      <div class="value">${ctx.orderNumber}</div>
    </div>

    ${storeLine}
    ${pickupAddressBlock}

    <p style="margin-top:16px">
      Please bring your order number or confirmation email when collecting your order.
    </p>
  `;

  return {
    subject: `Order ${ctx.orderNumber} is ready for pickup`,
    html: baseLayout(`Pickup Ready — ${ctx.orderNumber}`, body),
    text: [
      `Hi ${ctx.customerName},`,
      "",
      `Your order ${ctx.orderNumber} is ready for pickup.`,
      input.storeName ? `Pickup store: ${input.storeName}` : null,
      input.pickupAddress ? `Pickup location: ${input.pickupAddress}` : null,
      "Please bring your order number or confirmation email when collecting your order.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildOrderCancelledEmail(ctx: OrderEmailContext) {
  const body = `
    <span class="badge" style="background:#fef2f2;color:#b91c1c;border-color:#fecaca">❌ Order Cancelled</span>
    <h2>Your order has been cancelled</h2>
    <p>Hi ${ctx.customerName}, your order <strong>${ctx.orderNumber}</strong> has been successfully cancelled.</p>
    <div class="order-box">
      <div class="label">Order Number</div>
      <div class="value">${ctx.orderNumber}</div>
    </div>
    ${itemsTable(ctx)}
    ${trackingCta(ctx.trackingUrl)}
    <p style="margin-top:20px">If you didn't request this cancellation or have any questions, please contact our support team.</p>
  `;
  return {
    subject: `Order ${ctx.orderNumber} has been cancelled`,
    html: baseLayout(`Order Cancelled — ${ctx.orderNumber}`, body),
    text: `Hi ${ctx.customerName}, your order ${ctx.orderNumber} has been cancelled.${trackingTextLine(ctx.trackingUrl)}`,
  };
}
