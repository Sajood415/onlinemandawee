const PENDING_CHECKOUT_KEY = "onlinemandawee-pending-checkout";
const CHECKOUT_SUCCESS_KEY = "onlinemandawee-checkout-success";

export type PendingCheckoutSession = {
  contact: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
  };
  address: {
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
  };
  cartItems: Array<{ productId: string; quantity: number }>;
  vendorCoupons: Array<{ code: string; vendorProfileId: string }>;
  checkoutApiBase: string;
  useAuthCheckout: boolean;
  currency: string;
};

export type CheckoutSuccessSession = {
  orderNumber: string;
  guestEmail: string;
  paymentMethod: "card" | "cod";
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function savePendingCheckout(session: PendingCheckoutSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(session));
}

export function readPendingCheckout() {
  return readJson<PendingCheckoutSession>(PENDING_CHECKOUT_KEY);
}

export function clearPendingCheckout() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
}

export function saveCheckoutSuccess(session: CheckoutSuccessSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHECKOUT_SUCCESS_KEY, JSON.stringify(session));
}

export function consumeCheckoutSuccess() {
  if (typeof window === "undefined") return null;
  const data = readJson<CheckoutSuccessSession>(CHECKOUT_SUCCESS_KEY);
  sessionStorage.removeItem(CHECKOUT_SUCCESS_KEY);
  return data;
}
