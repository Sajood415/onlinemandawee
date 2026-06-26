import "server-only";

import { env } from "@/config/env";
import { prisma } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";

function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function payoutEmailLayout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
    <div style="background:#0f3460;padding:28px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:20px">Online Mandawee</h1>
      <p style="color:rgba(255,255,255,.75);margin:6px 0 0;font-size:13px">Vendor payout update</p>
    </div>
    <div style="padding:32px">${body}</div>
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
      © ${new Date().getFullYear()} Online Mandawee
    </div>
  </div>
</body></html>`;
}

export async function sendVendorPayoutNotification(input: {
  payoutId: string;
  type: "RELEASED" | "SENT";
  sentVia?: "BANK";
}) {
  try {
    const payout = await prisma.payout.findUnique({
      where: { id: input.payoutId },
    });

    if (!payout) return;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: payout.vendorProfileId },
      include: {
        user: { select: { email: true, fullName: true } },
      },
    });

    if (!vendor?.user.email) return;

    const orderVendor = await prisma.orderVendor.findUnique({
      where: { id: payout.orderVendorId },
      include: {
        order: { select: { orderNumber: true } },
      },
    });

    if (!orderVendor) return;

    const vendorName = vendor.user.fullName;
    const storeName = vendor.storeName ?? "your store";
    const orderNumber = orderVendor.order.orderNumber;
    const amountLabel = formatMoney(payout.amount, payout.currency);
    const reportsUrl = env.APP_URL ? `${env.APP_URL}/vendor/reports` : undefined;

    if (input.type === "RELEASED") {
      const body = `
        <p style="font-size:14px;color:#334155;line-height:1.6">Hi ${vendorName},</p>
        <p style="font-size:14px;color:#334155;line-height:1.6">
          Earnings for order <strong>${orderNumber}</strong> (${storeName}) have been <strong>released from hold</strong>.
          The net amount <strong>${amountLabel}</strong> is now queued for bank transfer by our finance team.
        </p>
        <p style="font-size:14px;color:#334155;line-height:1.6">
          You will receive another email once the transfer has been marked as sent.
        </p>
        ${
          reportsUrl
            ? `<p style="margin-top:24px;text-align:center"><a href="${reportsUrl}" style="display:inline-block;background:#0f3460;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:12px">View payout reports</a></p>`
            : ""
        }
      `;

      await sendTransactionalEmail({
        to: vendor.user.email,
        subject: `Payout released — ${orderNumber} (${amountLabel})`,
        html: payoutEmailLayout(`Payout released — ${orderNumber}`, body),
        text: [
          `Hi ${vendorName},`,
          "",
          `Payout released for order ${orderNumber} (${storeName}).`,
          `Net amount: ${amountLabel}.`,
          "Funds are queued for bank transfer; we will email you again when sent.",
          reportsUrl ? `Reports: ${reportsUrl}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
      return;
    }

    const body = `
      <p style="font-size:14px;color:#334155;line-height:1.6">Hi ${vendorName},</p>
      <p style="font-size:14px;color:#334155;line-height:1.6">
        We have marked your payout for order <strong>${orderNumber}</strong> (${storeName}) as <strong>sent via bank transfer</strong>.
      </p>
      <p style="font-size:14px;color:#334155;line-height:1.6">
        Amount transferred: <strong>${amountLabel}</strong>
      </p>
      <p style="font-size:14px;color:#64748b;line-height:1.6">
        Please allow standard banking processing time for funds to appear in your account.
      </p>
      ${
        reportsUrl
          ? `<p style="margin-top:24px;text-align:center"><a href="${reportsUrl}" style="display:inline-block;background:#0f3460;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:12px">View payout history</a></p>`
          : ""
      }
    `;

    await sendTransactionalEmail({
      to: vendor.user.email,
      subject: `Payout sent — ${orderNumber} (${amountLabel})`,
      html: payoutEmailLayout(`Payout sent — ${orderNumber}`, body),
      text: [
        `Hi ${vendorName},`,
        "",
        `Your payout for order ${orderNumber} (${storeName}) was sent via bank transfer.`,
        `Amount: ${amountLabel}.`,
        reportsUrl ? `History: ${reportsUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch {
    // Never fail payout operations because email failed.
  }
}
