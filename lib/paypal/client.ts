export function isPayPalCheckoutConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim());
}

export function getPayPalClientId() {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ?? "";
}

export function getPayPalSdkCurrency(currency: string) {
  return currency.trim().toUpperCase() || "USD";
}
