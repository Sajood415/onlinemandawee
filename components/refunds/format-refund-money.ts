export function formatRefundMoney(amountMinor: number, currency: string, locale = "en-US") {
  try {
    return new Intl.NumberFormat(locale === "fa-AF" ? "fa-AF" : locale === "ps" ? "ps-AF" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export function formatRefundDate(iso: string | null, locale = "en-US") {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale);
}
