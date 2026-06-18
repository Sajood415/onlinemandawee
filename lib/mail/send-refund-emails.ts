import "server-only";

import { env } from "@/config/env";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";

type RefundEmailCase = {
  id: string;
  reason: string;
  requestedAmount: number;
  status: string;
  order: {
    orderNumber: string;
    currency: string;
  };
  orderItem: {
    productName: string;
  };
  customer: {
    fullName: string;
    email: string;
  };
  vendor: {
    storeName: string | null;
    user: {
      fullName: string;
      email: string;
    };
  };
  decision?: {
    decisionType: string;
    approvedAmount: number;
    reason: string | null;
  } | null;
};

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
      <p>Refund & dispute notifications</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">© ${new Date().getFullYear()} ${env.APP_NAME}</div>
  </div>
</body>
</html>`;
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100);
}

function adminNotifyEmail() {
  return env.REFUND_NOTIFY_EMAIL ?? env.GIFT_REQUEST_NOTIFY_EMAIL ?? null;
}

function caseSummaryBox(refundCase: RefundEmailCase) {
  return `
    <div class="box">
      <div class="label">Order</div>
      <div class="value">${refundCase.order.orderNumber}</div>
      <p style="margin:12px 0 0;">
        <strong>Item:</strong> ${refundCase.orderItem.productName}<br />
        <strong>Reason:</strong> ${refundCase.reason}<br />
        <strong>Requested:</strong> ${formatMoney(refundCase.requestedAmount, refundCase.order.currency)}<br />
        <strong>Status:</strong> ${refundCase.status.replaceAll("_", " ")}
      </p>
    </div>
  `;
}

export async function sendRefundOpenedVendorEmail(refundCase: RefundEmailCase) {
  const body = `
    <h2>New refund request</h2>
    <p>Hi ${refundCase.vendor.user.fullName}, a customer opened a refund case for ${refundCase.vendor.storeName ?? "your store"}. Please respond within 48 hours.</p>
    ${caseSummaryBox(refundCase)}
    <p>Open your vendor dashboard to accept, reject, or reply in the dispute thread.</p>
  `;

  await sendTransactionalEmail({
    to: refundCase.vendor.user.email,
    subject: `Refund request — ${refundCase.order.orderNumber}`,
    text: [
      `Hi ${refundCase.vendor.user.fullName},`,
      "",
      `A customer requested a refund for order ${refundCase.order.orderNumber}.`,
      `Item: ${refundCase.orderItem.productName}`,
      `Amount: ${formatMoney(refundCase.requestedAmount, refundCase.order.currency)}`,
      "Please respond within 48 hours in your vendor dashboard.",
    ].join("\n"),
    html: emailLayout(`Refund request ${refundCase.order.orderNumber}`, body),
  });
}

export async function sendRefundOpenedCustomerEmail(refundCase: RefundEmailCase) {
  const body = `
    <h2>Refund request submitted</h2>
    <p>Hi ${refundCase.customer.fullName}, we received your refund request and notified the vendor.</p>
    ${caseSummaryBox(refundCase)}
    <p>You can track progress and chat with the vendor from your account disputes page.</p>
  `;

  await sendTransactionalEmail({
    to: refundCase.customer.email,
    subject: `Refund request submitted — ${refundCase.order.orderNumber}`,
    text: [
      `Hi ${refundCase.customer.fullName},`,
      "",
      `Your refund request for order ${refundCase.order.orderNumber} was submitted.`,
      `Item: ${refundCase.orderItem.productName}`,
      "Track the case in your account disputes page.",
    ].join("\n"),
    html: emailLayout(`Refund submitted ${refundCase.order.orderNumber}`, body),
  });
}

export async function sendRefundEscalatedAdminEmail(refundCase: RefundEmailCase) {
  const adminEmail = adminNotifyEmail();
  if (!adminEmail) return;

  const body = `
    <h2>Refund case escalated</h2>
    <p>A refund case needs admin review.</p>
    ${caseSummaryBox(refundCase)}
    <p><strong>Customer:</strong> ${refundCase.customer.fullName} (${refundCase.customer.email})</p>
    <p><strong>Vendor:</strong> ${refundCase.vendor.storeName ?? "Store"} (${refundCase.vendor.user.email})</p>
  `;

  await sendTransactionalEmail({
    to: adminEmail,
    subject: `Escalated refund — ${refundCase.order.orderNumber}`,
    text: [
      "A refund case was escalated for admin review.",
      `Order: ${refundCase.order.orderNumber}`,
      `Customer: ${refundCase.customer.fullName}`,
      `Vendor: ${refundCase.vendor.storeName ?? "Store"}`,
    ].join("\n"),
    html: emailLayout(`Escalated refund ${refundCase.order.orderNumber}`, body),
  });
}

export async function sendRefundDecisionEmails(refundCase: RefundEmailCase) {
  const decision = refundCase.decision;
  if (!decision) return;

  const amountLabel = formatMoney(decision.approvedAmount, refundCase.order.currency);
  const decisionLabel = decision.decisionType.replaceAll("_", " ");

  const customerBody = `
    <h2>Refund decision</h2>
    <p>Hi ${refundCase.customer.fullName}, your refund case for order ${refundCase.order.orderNumber} was resolved.</p>
    ${caseSummaryBox(refundCase)}
    <div class="box">
      <strong>Decision:</strong> ${decisionLabel}<br />
      <strong>Approved amount:</strong> ${amountLabel}
      ${decision.reason ? `<br /><strong>Note:</strong> ${decision.reason}` : ""}
    </div>
  `;

  await sendTransactionalEmail({
    to: refundCase.customer.email,
    subject: `Refund decision — ${refundCase.order.orderNumber}`,
    text: [
      `Hi ${refundCase.customer.fullName},`,
      "",
      `Your refund case was resolved: ${decisionLabel}.`,
      `Approved amount: ${amountLabel}.`,
    ].join("\n"),
    html: emailLayout(`Refund decision ${refundCase.order.orderNumber}`, customerBody),
  });

  const vendorBody = `
    <h2>Refund case resolved</h2>
    <p>Hi ${refundCase.vendor.user.fullName}, a refund case for ${refundCase.vendor.storeName ?? "your store"} was resolved.</p>
    ${caseSummaryBox(refundCase)}
    <div class="box">
      <strong>Decision:</strong> ${decisionLabel}<br />
      <strong>Approved amount:</strong> ${amountLabel}
    </div>
  `;

  await sendTransactionalEmail({
    to: refundCase.vendor.user.email,
    subject: `Refund resolved — ${refundCase.order.orderNumber}`,
    text: [
      `Refund case resolved for order ${refundCase.order.orderNumber}.`,
      `Decision: ${decisionLabel}. Approved amount: ${amountLabel}.`,
    ].join("\n"),
    html: emailLayout(`Refund resolved ${refundCase.order.orderNumber}`, vendorBody),
  });
}

export async function sendRefundOverdueEscalationSummaryEmail(input: {
  count: number;
  orderNumbers: string[];
}) {
  const adminEmail = adminNotifyEmail();
  if (!adminEmail || input.count === 0) return;

  const list = input.orderNumbers.slice(0, 10).map((orderNumber) => `<li>${orderNumber}</li>`).join("");
  const body = `
    <h2>Overdue vendor refund responses</h2>
    <p>${input.count} refund case${input.count === 1 ? "" : "s"} ${input.count === 1 ? "was" : "were"} auto-escalated because the vendor missed the 48-hour SLA.</p>
    <ul>${list}</ul>
    ${input.orderNumbers.length > 10 ? `<p>…and ${input.orderNumbers.length - 10} more.</p>` : ""}
  `;

  await sendTransactionalEmail({
    to: adminEmail,
    subject: `${input.count} overdue refund case${input.count === 1 ? "" : "s"} escalated`,
    text: `${input.count} refund cases were auto-escalated for overdue vendor response.`,
    html: emailLayout("Overdue refund escalations", body),
  });
}
