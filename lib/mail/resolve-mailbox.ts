import { env } from "@/config/env.shared";

export function extractEmailAddress(value: string | undefined | null) {
  if (!value) return null;
  const match =
    value.match(/<([^>]+@[^>]+)>/) ?? value.match(/([^\s<>]+@[^\s<>]+)/);
  return match?.[1]?.trim().toLowerCase() ?? null;
}

export function extractDisplayName(from: string) {
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
}

export function isPlaceholderMailbox(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith("@mandawee.local") || normalized.endsWith(".local");
}

/** Only notify the vendor's own mailbox. Skip seed/placeholder addresses. */
export function resolveVendorOrderNotifyEmail(vendorUserEmail: string) {
  const vendorEmail = vendorUserEmail.trim().toLowerCase();
  if (!vendorEmail || isPlaceholderMailbox(vendorEmail)) {
    return null;
  }
  return vendorEmail;
}

export function resolveTransactionalFromAddress() {
  const configured = env.SMTP_FROM ?? `${env.APP_NAME} <noreply@onlinemandawee.com>`;
  const host = (env.SMTP_HOST ?? "").toLowerCase();
  const smtpUser = env.SMTP_USER?.trim();

  if (!smtpUser) return configured;

  // Gmail SMTP only sends as the authenticated mailbox (not arbitrary From domains).
  if (host.includes("gmail") || host.includes("google")) {
    const displayName = extractDisplayName(configured) ?? env.APP_NAME;
    return `${displayName} <${smtpUser}>`;
  }

  return configured;
}
