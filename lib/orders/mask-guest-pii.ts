export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0) return "***";

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3) return "***";

  const last = digits.slice(-3);
  const prefix = trimmed.startsWith("+") ? trimmed.match(/^\+\d{1,3}/)?.[0] ?? "+" : "";
  return prefix ? `${prefix} *** ***${last}` : `*** ***${last}`;
}

export function maskAddressLine(): string {
  return "••••••";
}
