import "server-only";

import { env } from "@/config/env";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import type { GiftRequestRecord } from "@/repositories/gift-request.repository";

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
      <p>Gift delivery for loved ones in Afghanistan</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">© ${new Date().getFullYear()} ${env.APP_NAME}</div>
  </div>
</body>
</html>`;
}

function formatOptional(value: string | null | undefined, fallback = "—") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatMediaSummary(request: GiftRequestRecord) {
  const imageCount = request.imageUrls.length;
  const videoCount = request.videoUrls.length;
  if (imageCount === 0 && videoCount === 0) return null;

  const parts: string[] = [];
  if (imageCount > 0) {
    parts.push(`${imageCount} image${imageCount === 1 ? "" : "s"}`);
  }
  if (videoCount > 0) {
    parts.push(`${videoCount} video${videoCount === 1 ? "" : "s"}`);
  }

  return parts.join(", ");
}

function buildMediaEmailSection(request: GiftRequestRecord) {
  const summary = formatMediaSummary(request);
  if (!summary) return "";

  const links = [...request.imageUrls, ...request.videoUrls]
    .map((url) => `<li><a href="${url}">${url}</a></li>`)
    .join("");

  return `
    <div class="box">
      <strong>Reference media:</strong> ${summary}<br />
      <ul style="margin: 8px 0 0; padding-left: 18px;">${links}</ul>
    </div>
  `;
}

export function buildGiftRequestConfirmationEmail(request: GiftRequestRecord) {
  const body = `
    <h2>We received your gift request</h2>
    <p>Hi ${request.senderName}, thank you for reaching out. Our team will review your request and contact you with a quote and delivery plan.</p>
    <div class="box">
      <div class="label">Request number</div>
      <div class="value">${request.requestNumber}</div>
    </div>
    <div class="box">
      <strong>Recipient:</strong> ${request.recipientName}<br />
      <strong>City:</strong> ${request.recipientCity}${request.recipientProvince ? `, ${request.recipientProvince}` : ""}<br />
      ${request.preferredDeliveryDate ? `<strong>Preferred date:</strong> ${request.preferredDeliveryDate}<br />` : ""}
      ${request.occasion ? `<strong>Occasion:</strong> ${request.occasion}<br />` : ""}
    </div>
    ${buildMediaEmailSection(request)}
    <p>Keep this request number handy if you need to follow up with support.</p>
  `;

  return {
    subject: `Gift request received — ${request.requestNumber}`,
    html: emailLayout(`Gift request ${request.requestNumber}`, body),
    text: [
      `Hi ${request.senderName},`,
      "",
      `We received your gift request ${request.requestNumber}.`,
      `Recipient: ${request.recipientName} in ${request.recipientCity}.`,
      formatMediaSummary(request)
        ? `Reference media: ${formatMediaSummary(request)}. View in your account or admin portal.`
        : null,
      "Our team will contact you soon with next steps.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildGiftRequestAdminNotificationEmail(request: GiftRequestRecord) {
  const body = `
    <h2>New personalized gift request</h2>
    <p>A customer submitted a gift request that needs review.</p>
    <div class="box">
      <div class="label">Request number</div>
      <div class="value">${request.requestNumber}</div>
    </div>
    <div class="box">
      <strong>Sender:</strong> ${request.senderName} (${request.senderEmail}, ${request.senderPhone})<br />
      <strong>Recipient:</strong> ${request.recipientName} (${request.recipientPhone})<br />
      <strong>Location:</strong> ${request.recipientAddress}, ${request.recipientCity}${request.recipientProvince ? `, ${request.recipientProvince}` : ""}<br />
      <strong>Occasion:</strong> ${formatOptional(request.occasion)}<br />
      <strong>Preferred date:</strong> ${formatOptional(request.preferredDeliveryDate)}<br />
      <strong>Budget note:</strong> ${formatOptional(request.budgetNote)}
    </div>
    <div class="box">
      <strong>Preparation:</strong><br />${request.preparationNotes.replace(/\n/g, "<br />")}
    </div>
    <div class="box">
      <strong>Delivery instructions:</strong><br />${request.deliveryInstructions.replace(/\n/g, "<br />")}
    </div>
    ${buildMediaEmailSection(request)}
  `;

  return {
    subject: `New gift request ${request.requestNumber}`,
    html: emailLayout(`New gift request ${request.requestNumber}`, body),
    text: [
      `New gift request ${request.requestNumber}`,
      `Sender: ${request.senderName} <${request.senderEmail}>`,
      `Recipient: ${request.recipientName} in ${request.recipientCity}`,
      `Preparation: ${request.preparationNotes}`,
      `Delivery: ${request.deliveryInstructions}`,
      formatMediaSummary(request) ? `Reference media: ${formatMediaSummary(request)}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function formatQuoteAmount(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(major);
}

export function buildGiftRequestQuoteEmail(request: GiftRequestRecord) {
  if (!request.quoteAmountMinor || !request.quoteCurrency) {
    throw new Error("Gift request quote is incomplete");
  }

  const amountLabel = formatQuoteAmount(request.quoteAmountMinor, request.quoteCurrency);
  const imageSection = request.quoteImageUrl
    ? `<div style="margin:16px 0;text-align:center;">
        <img src="${request.quoteImageUrl}" alt="Gift preview" style="max-width:100%;border-radius:12px;border:1px solid #e2e8f0;" />
      </div>`
    : "";

  const body = `
    <h2>Your gift quote is ready</h2>
    <p>Hi ${request.senderName}, our team prepared your personalized gift and sent you a quote.</p>
    <div class="box">
      <div class="label">Request number</div>
      <div class="value">${request.requestNumber}</div>
    </div>
    ${imageSection}
    <div class="box">
      <strong>Amount due:</strong> ${amountLabel}<br />
      <strong>Recipient:</strong> ${request.recipientName} in ${request.recipientCity}<br />
      ${request.quoteNote ? `<strong>Note from our team:</strong><br />${request.quoteNote.replace(/\n/g, "<br />")}` : ""}
    </div>
    <p>Sign in to your account, open <strong>Gift requests</strong>, and tap <strong>Pay now</strong> to complete payment by card.</p>
    <p>If you prefer bank transfer or another method, reply to this email and our team will confirm once payment is received.</p>
  `;

  return {
    subject: `Gift quote ready — ${request.requestNumber}`,
    html: emailLayout(`Gift quote ${request.requestNumber}`, body),
    text: [
      `Hi ${request.senderName},`,
      "",
      `Your gift quote for ${request.requestNumber} is ready.`,
      `Amount due: ${amountLabel}`,
      request.quoteNote ? `Note: ${request.quoteNote}` : null,
      "Log in to My Account → Gift requests to pay online.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function resolveAdminNotifyEmail() {
  if (env.GIFT_REQUEST_NOTIFY_EMAIL) return env.GIFT_REQUEST_NOTIFY_EMAIL;
  const from = env.SMTP_FROM ?? "";
  const match = from.match(/<([^>]+@[^>]+)>/) ?? from.match(/([^\s<>]+@[^\s<>]+)/);
  return match?.[1] ?? null;
}

export async function sendGiftRequestQuoteEmail(request: GiftRequestRecord) {
  try {
    const quoteEmail = buildGiftRequestQuoteEmail(request);
    await sendTransactionalEmail({
      to: request.senderEmail,
      ...quoteEmail,
    });
  } catch {
    // Quote is saved; do not fail if customer mail fails.
  }
}

export async function sendGiftRequestEmails(request: GiftRequestRecord) {
  try {
    const confirmation = buildGiftRequestConfirmationEmail(request);
    await sendTransactionalEmail({
      to: request.senderEmail,
      ...confirmation,
    });
  } catch {
    // Request is saved; do not fail if customer mail fails.
  }

  const adminEmail = resolveAdminNotifyEmail();
  if (!adminEmail) return;

  try {
    const notification = buildGiftRequestAdminNotificationEmail(request);
    await sendTransactionalEmail({
      to: adminEmail,
      ...notification,
    });
  } catch {
    // Non-blocking for admin notification.
  }
}
