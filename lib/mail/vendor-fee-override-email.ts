import { buildVendorReviewStatusEmailHtml } from "@/lib/mail/vendor-review-status-email-html";
import { formatCommissionRatePercent } from "@/lib/platform/transaction-fee";

export type VendorFeeOverrideEmailChange = {
  membership?: {
    kind: "default" | "custom" | "waived";
    amountMinor?: number;
    currency?: string;
    endsAt?: string | null;
  };
  commission?: {
    kind: "default" | "custom" | "waived";
    rateBps?: number;
    endsAt?: string | null;
  };
};

function moneyLabel(amountMinor: number, currency: string) {
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

function endLabel(endsAt?: string | null) {
  if (!endsAt) return "until further notice";
  const date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) return "until further notice";
  return `until ${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

export function buildVendorFeeOverrideEmail(input: {
  appName?: string;
  storeName?: string | null;
  currency: string;
  change: VendorFeeOverrideEmailChange;
}) {
  const app = input.appName ?? "Online Mandawee";
  const lines: string[] = [];

  if (input.change.membership) {
    const m = input.change.membership;
    if (m.kind === "waived") {
      lines.push(`Monthly membership fee: waived (${endLabel(m.endsAt)}).`);
    } else if (m.kind === "custom") {
      lines.push(
        `Monthly membership fee: ${moneyLabel(m.amountMinor ?? 0, input.currency)}/month (${endLabel(m.endsAt)}).`
      );
    } else {
      lines.push("Monthly membership fee: restored to the standard platform rate.");
    }
  }

  if (input.change.commission) {
    const c = input.change.commission;
    if (c.kind === "waived") {
      lines.push(`Sales commission: waived / 0% (${endLabel(c.endsAt)}).`);
    } else if (c.kind === "custom") {
      lines.push(
        `Sales commission: ${formatCommissionRatePercent(c.rateBps ?? 0)} per sale (${endLabel(c.endsAt)}).`
      );
    } else {
      lines.push("Sales commission: restored to the standard platform rate.");
    }
  }

  const message = [
    input.storeName
      ? `An admin updated marketplace fees for ${input.storeName}.`
      : "An admin updated your marketplace fees.",
    "",
    ...lines,
    "",
    "This applies going forward. Past orders and invoices are unchanged.",
  ].join("\n");

  const subject = `${app} — vendor fee update`;
  const html = buildVendorReviewStatusEmailHtml({
    appName: app,
    heading: "Vendor fee update",
    message,
  });

  return {
    subject,
    text: message,
    html,
  };
}
