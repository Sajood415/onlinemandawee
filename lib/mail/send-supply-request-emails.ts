import "server-only";

import { env } from "@/config/env";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import type { SupplyRequestRecord } from "@/repositories/supply-request.repository";

function emailLayout(title: string, body: string) {
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
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
    .header p { color: rgba(255,255,255,.7); margin: 6px 0 0; font-size: 13px; }
    .body { padding: 32px 40px; }
    h2 { margin: 0 0 8px; font-size: 20px; color: #0f172a; }
    p { margin: 0 0 16px; font-size: 14px; color: #64748b; line-height: 1.6; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 16px 0; font-size: 13px; color: #334155; line-height: 1.7; }
    .label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 700; color: #0f3460; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${env.APP_NAME}</h1>
      <p>Product Supply Request</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">© ${new Date().getFullYear()} ${env.APP_NAME}</div>
  </div>
</body>
</html>`;
}

function formatQuoteAmount(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(major);
}

function trackUrl(token: string) {
  const base = env.APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/en/supply-request/track?token=${encodeURIComponent(token)}`;
}

function resolveAdminNotifyEmail() {
  if (env.SUPPLY_REQUEST_NOTIFY_EMAIL) return env.SUPPLY_REQUEST_NOTIFY_EMAIL;
  if (env.GIFT_REQUEST_NOTIFY_EMAIL) return env.GIFT_REQUEST_NOTIFY_EMAIL;
  const from = env.SMTP_FROM ?? "";
  const match = from.match(/<([^>]+@[^>]+)>/) ?? from.match(/([^\s<>]+@[^\s<>]+)/);
  return match?.[1] ?? null;
}

async function safeSend(to: string, payload: { subject: string; html: string; text: string }) {
  try {
    await sendTransactionalEmail({ to, ...payload });
  } catch {
    // Non-blocking
  }
}

export function buildSupplyRequestConfirmationEmail(request: SupplyRequestRecord) {
  const link = trackUrl(request.guestTrackingToken);
  const body = `
    <h2>We received your Product Supply Request</h2>
    <p>Hi ${request.customerName}, thank you. Our team will source the product and send you a quote. You only pay if you accept.</p>
    <div class="box">
      <div class="label">Request number</div>
      <div class="value">${request.requestNumber}</div>
    </div>
    <div class="box">
      <strong>Product:</strong> ${request.productName}<br />
      <strong>Quantity:</strong> ${request.quantity}<br />
      <strong>Delivery:</strong> ${request.deliveryMode}
    </div>
    <p>Track your request: <a href="${link}">${link}</a></p>
  `;

  return {
    subject: `Product Supply Request received — ${request.requestNumber}`,
    html: emailLayout(`Product Supply Request ${request.requestNumber}`, body),
    text: [
      `Hi ${request.customerName},`,
      `We received your Product Supply Request ${request.requestNumber} for ${request.productName}.`,
      `Track: ${link}`,
    ].join("\n"),
  };
}

export function buildSupplyRequestAdminNotificationEmail(request: SupplyRequestRecord) {
  const body = `
    <h2>New Product Supply Request</h2>
    <div class="box">
      <div class="label">Request number</div>
      <div class="value">${request.requestNumber}</div>
    </div>
    <div class="box">
      <strong>Customer:</strong> ${request.customerName} (${request.customerEmail}, ${request.customerPhone})<br />
      <strong>Product:</strong> ${request.productName}<br />
      <strong>Qty:</strong> ${request.quantity}<br />
      <strong>City:</strong> ${request.city}<br />
      <strong>Mode:</strong> ${request.deliveryMode}
    </div>
    <div class="box">
      <strong>Description:</strong><br />${request.description.replace(/\n/g, "<br />")}
    </div>
  `;

  return {
    subject: `New Product Supply Request ${request.requestNumber}`,
    html: emailLayout(`New Product Supply Request ${request.requestNumber}`, body),
    text: `New Product Supply Request ${request.requestNumber}: ${request.productName} from ${request.customerName}`,
  };
}

export function buildSupplyRequestQuoteEmail(request: SupplyRequestRecord) {
  if (!request.quoteAmountMinor || !request.quoteCurrency) {
    throw new Error("Supply request quote is incomplete");
  }

  const amountLabel = formatQuoteAmount(request.quoteAmountMinor, request.quoteCurrency);
  const link = trackUrl(request.guestTrackingToken);
  const imageSection = request.quoteImageUrl
    ? `<div style="margin:16px 0;text-align:center;">
        <img src="${request.quoteImageUrl}" alt="Quote preview" style="max-width:100%;border-radius:12px;border:1px solid #e2e8f0;" />
      </div>`
    : "";

  const body = `
    <h2>Your supply quote is ready</h2>
    <p>Hi ${request.customerName}, we found a match for <strong>${request.productName}</strong>.</p>
    ${imageSection}
    <div class="box">
      <div class="label">Amount due</div>
      <div class="value">${amountLabel}</div>
      ${request.quoteNote ? `<p style="margin-top:12px;">${request.quoteNote.replace(/\n/g, "<br />")}</p>` : ""}
      ${request.quoteExpiresAt ? `<p><strong>Expires:</strong> ${request.quoteExpiresAt.toISOString()}</p>` : ""}
    </div>
    <p>Pay or track here: <a href="${link}">${link}</a></p>
  `;

  return {
    subject: `Product Supply Request quote ready — ${request.requestNumber}`,
    html: emailLayout(`Product Supply Request quote ${request.requestNumber}`, body),
    text: [
      `Hi ${request.customerName},`,
      `Quote for ${request.requestNumber}: ${amountLabel}`,
      `Pay: ${link}`,
    ].join("\n"),
  };
}

function simpleCustomerEmail(
  request: SupplyRequestRecord,
  title: string,
  message: string
) {
  const link = trackUrl(request.guestTrackingToken);
  const body = `
    <h2>${title}</h2>
    <p>Hi ${request.customerName}, ${message}</p>
    <div class="box">
      <div class="label">Request number</div>
      <div class="value">${request.requestNumber}</div>
    </div>
    <p><a href="${link}">View request</a></p>
  `;
  return {
    subject: `${title} — ${request.requestNumber}`,
    html: emailLayout(title, body),
    text: `Hi ${request.customerName}, ${message} Request ${request.requestNumber}. ${link}`,
  };
}

export async function sendSupplyRequestCreatedEmails(request: SupplyRequestRecord) {
  await safeSend(request.customerEmail, buildSupplyRequestConfirmationEmail(request));
  const adminEmail = resolveAdminNotifyEmail();
  if (adminEmail) {
    await safeSend(adminEmail, buildSupplyRequestAdminNotificationEmail(request));
  }
}

export async function sendSupplyRequestQuoteEmail(request: SupplyRequestRecord) {
  await safeSend(request.customerEmail, buildSupplyRequestQuoteEmail(request));
}

export async function sendSupplyRequestPaidEmail(request: SupplyRequestRecord) {
  await safeSend(
    request.customerEmail,
    simpleCustomerEmail(
      request,
      "Payment received",
      "we received your payment and are fulfilling your Product Supply Request."
    )
  );
}

export async function sendSupplyRequestRejectedEmail(request: SupplyRequestRecord) {
  const reason = request.rejectReason?.trim() || "We could not fulfill this request.";
  await safeSend(
    request.customerEmail,
    simpleCustomerEmail(request, "Product Supply Request declined", reason)
  );
}

export async function sendSupplyRequestCancelledEmail(request: SupplyRequestRecord) {
  await safeSend(
    request.customerEmail,
    simpleCustomerEmail(
      request,
      "Product Supply Request cancelled",
      "this Product Supply Request has been cancelled."
    )
  );
}

export async function sendSupplyRequestExpiredEmail(request: SupplyRequestRecord) {
  await safeSend(
    request.customerEmail,
    simpleCustomerEmail(
      request,
      "Quote expired",
      "your quote expired before payment. Submit a new request if you still need the product."
    )
  );
}

export async function sendSupplyRequestShippedEmail(request: SupplyRequestRecord) {
  const tracking = request.trackingRef
    ? ` Tracking: ${request.trackingRef}.`
    : "";
  await safeSend(
    request.customerEmail,
    simpleCustomerEmail(
      request,
      "Your order has shipped",
      `your Product Supply Request is on the way.${tracking}`
    )
  );
}

export async function sendSupplyRequestCompletedEmail(request: SupplyRequestRecord) {
  await safeSend(
    request.customerEmail,
    simpleCustomerEmail(
      request,
      "Product Supply Request completed",
      "your Product Supply Request is complete. Thank you for shopping with us."
    )
  );
}

export async function sendSupplyRequestRefundedEmail(request: SupplyRequestRecord) {
  const amount =
    request.refundAmountMinor && request.quoteCurrency
      ? formatQuoteAmount(request.refundAmountMinor, request.quoteCurrency)
      : "a refund";
  await safeSend(
    request.customerEmail,
    simpleCustomerEmail(
      request,
      "Refund processed",
      `we processed ${amount} for your Product Supply Request.`
    )
  );
}

export async function sendSupplyRequestNeedsInfoEmail(
  request: SupplyRequestRecord,
  message: string
) {
  await safeSend(
    request.customerEmail,
    simpleCustomerEmail(request, "More information needed", message)
  );
}
