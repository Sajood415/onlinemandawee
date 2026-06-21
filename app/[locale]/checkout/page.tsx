"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  getStripeCheckoutLocale,
  getStripePromise,
  isStripeCheckoutConfigured,
  STRIPE_CHECKOUT_CURRENCY_LABEL,
} from "@/lib/stripe/client";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  ShoppingBag,
  ClipboardList,
  Truck,
  X,
} from "lucide-react";

import { PageLoader } from "@/components/ui/PageLoader";
import { convertMajorUnits } from "@/lib/currency/convert";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  sanitizeCityCountryInput,
  sanitizeNameInput,
  sanitizePhoneInput,
  sanitizePostalCodeInput,
  validateCheckoutShippingForm,
  validateGuestEmail,
  validateGuestName,
  validateGuestPhone,
  validateAddressLine,
  validateCity,
  validateCountry,
  validatePostalCode,
} from "@/lib/checkout/checkout-field-validation";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/store/auth-context";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";

/* ─── Stripe setup ───────────────────────────────────────────────────── */

const stripePromise = getStripePromise();

/* ─── Types ──────────────────────────────────────────────────────────── */

type LineItem = {
  productId: string;
  productName: string;
  productImage: string | null;
  productSku: string | null;
  vendorProfileId: string;
  categoryId: string;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount: number;
  currency: string;
};

type QuoteSummary = {
  clientSecret: string;
  paymentIntentId: string;
  checkoutContextToken: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  currency: string;
  lineItems: LineItem[];
  appliedCoupons: AppliedCouponSummary[];
};

type AppliedCouponSummary = {
  code: string;
  vendorProfileId: string;
  vendorStoreName: string | null;
  discountAmount: number;
};

type CouponEligibleVendor = {
  vendorProfileId: string;
  storeName: string;
};

type VendorCouponEntry = {
  code: string;
  vendorProfileId: string;
};

type CheckoutVendorOffer = {
  vendorProfileId: string;
  storeName: string | null;
  coupons: Array<{
    code: string;
    label: string;
    discountType: "PERCENTAGE" | "FIXED_AMOUNT";
    discountValue: number;
    minOrderAmount: number | null;
  }>;
};

type DeliveryBreakdownEntry = {
  vendorProfileId: string;
  vendorStoreName: string | null;
  distanceKm: number;
  baseFeeAmount: number;
  perKmRateAmount: number;
  deliveryAmount: number;
};

type PriceSummary = {
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  currency: string;
  lineItems: LineItem[];
  appliedCoupons: AppliedCouponSummary[];
  deliveryBreakdown?: DeliveryBreakdownEntry[];
};

type ContactForm = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
};

type AddressForm = {
  addressLine1: string;
  city: string;
  country: string;
  postalCode: string;
};

type DeliveryMethod = "PICKUP" | "EXPRESS" | "STANDARD";

const CHECKOUT_PENDING_STORAGE_KEY = "checkout-pending-confirmations";

type PendingCheckoutConfirmation = {
  checkoutApiBase: string;
  useAuthCheckout: boolean;
  payload: {
    paymentIntentId: string;
    checkoutContextToken: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    addressLine1?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    deliveryMethod: DeliveryMethod;
    currency: string;
    items: Array<{ productId: string; quantity: number }>;
    vendorCoupons: VendorCouponEntry[];
  };
};

function persistPendingCheckoutConfirmation(input: PendingCheckoutConfirmation) {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(CHECKOUT_PENDING_STORAGE_KEY);
  const existing = raw ? (JSON.parse(raw) as Record<string, PendingCheckoutConfirmation>) : {};
  existing[input.payload.paymentIntentId] = input;
  window.sessionStorage.setItem(CHECKOUT_PENDING_STORAGE_KEY, JSON.stringify(existing));
}

function clearPendingCheckoutConfirmation(paymentIntentId: string) {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(CHECKOUT_PENDING_STORAGE_KEY);
  if (!raw) return;
  const existing = JSON.parse(raw) as Record<string, PendingCheckoutConfirmation>;
  delete existing[paymentIntentId];
  window.sessionStorage.setItem(CHECKOUT_PENDING_STORAGE_KEY, JSON.stringify(existing));
}

function isDeliveryAddressComplete(address: AddressForm) {
  return (
    address.addressLine1.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.country.trim().length > 0
  );
}

function getCheckoutApiBase(isCustomerCheckout: boolean) {
  return isCustomerCheckout ? "/api/checkout/customer" : "/api/checkout/guest";
}

async function postCheckout(
  path: string,
  body: unknown,
  useAuth: boolean
) {
  if (useAuth) {
    return fetchWithAuth(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildGuestCheckoutRequestBody(
  items: Array<{ productId: string; quantity: number }>,
  currency: string,
  vendorCoupons: VendorCouponEntry[],
  checkoutGuestEmail: string,
  address: AddressForm,
  deliveryMethod: DeliveryMethod,
  addressRequired: boolean
) {
  const body: Record<string, unknown> = {
    items,
    currency,
    vendorCoupons,
    deliveryMethod,
    checkoutGuestEmail,
  };

  if (addressRequired && isDeliveryAddressComplete(address)) {
    body.deliveryAddress = {
      addressLine1: address.addressLine1.trim(),
      city: address.city.trim(),
      country: address.country.trim(),
      postalCode: address.postalCode.trim(),
    };
  }

  return body;
}

type CustomerAddress = {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  addressLine1: string;
  postalCode: string | null;
  isDefault: boolean;
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

const STEP_LABELS = ["Shipping", "Delivery", "Payment", "Review"];

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function InputField({
  label,
  required,
  error,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-gray-200 focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
        }`}
      />
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

/* ─── Coupon input ───────────────────────────────────────────────────── */

function CouponSection({
  storeName,
  couponInput,
  onCouponInputChange,
  appliedCoupons,
  availableOffers,
  fieldError,
  onApply,
  onRemove,
  applying,
}: {
  storeName: string;
  couponInput: string;
  onCouponInputChange: (value: string) => void;
  appliedCoupons: AppliedCouponSummary[];
  availableOffers: Array<{ code: string; label: string }>;
  fieldError?: string;
  onApply: () => void;
  onRemove: (code: string) => void;
  applying: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
      <p className="text-sm font-semibold text-gray-800">
        Discount code for <span className="text-[#0f3460]">{storeName}</span>
      </p>
      {availableOffers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableOffers.map((offer) => (
            <button
              key={offer.code}
              type="button"
              onClick={() => onCouponInputChange(offer.code)}
              className="rounded-full border border-[#0f3460]/25 bg-white px-3 py-1 text-xs font-semibold text-[#0f3460] transition hover:bg-[#0f3460]/5"
            >
              {offer.code} · {offer.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          value={couponInput}
          onChange={(event) => onCouponInputChange(event.target.value.toUpperCase())}
          placeholder="SAVE10"
          className={`flex-1 rounded-xl border px-4 py-3 text-sm uppercase outline-none focus:ring-2 focus:ring-[#0f3460]/10 ${
            fieldError
              ? "border-red-300 focus:border-red-500"
              : "border-gray-200 focus:border-[#0f3460]"
          }`}
        />
        <button
          type="button"
          onClick={onApply}
          disabled={applying || !couponInput.trim()}
          className="rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-50"
        >
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
      {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
      {appliedCoupons.length > 0 ? (
        <div className="space-y-2">
          {appliedCoupons.map((coupon) => (
            <div
              key={coupon.code}
              className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm"
            >
              <div>
                <p className="font-semibold text-green-800">{coupon.code}</p>
                <p className="text-xs text-green-700">
                  {coupon.vendorStoreName ?? "Vendor"} · -{formatAmount(coupon.discountAmount, "USD")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(coupon.code)}
                className="rounded-lg p-1.5 text-green-700 hover:bg-green-100"
                aria-label={`Remove coupon ${coupon.code}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Applies only to {storeName}&apos;s products in your cart.
        </p>
      )}
    </div>
  );
}

/* ─── Step 1: Shipping address ─────────────────────────────────────── */

type ShippingFieldErrors = Partial<
  Record<keyof ContactForm | keyof AddressForm, string>
>;

function ShippingAddressStep({
  contact,
  address,
  addressRequired,
  hasThirdPartyProducts,
  deliveryMethod,
  onDeliveryMethodChange,
  savedAddresses,
  onContactChange,
  onAddressChange,
  onSelectSavedAddress,
  onNext,
}: {
  contact: ContactForm;
  address: AddressForm;
  addressRequired: boolean;
  hasThirdPartyProducts: boolean;
  deliveryMethod: DeliveryMethod;
  onDeliveryMethodChange: (method: DeliveryMethod) => void;
  savedAddresses: CustomerAddress[];
  onContactChange: (f: Partial<ContactForm>) => void;
  onAddressChange: (f: Partial<AddressForm>) => void;
  onSelectSavedAddress: (saved: CustomerAddress) => void;
  onNext: () => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<ShippingFieldErrors>({});

  const clearFieldError = (field: keyof ShippingFieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCheckoutShippingForm(contact, address, {
      addressRequired,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasThirdPartyProducts ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Third-party delivery method</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([
              ["PICKUP", "Pickup"],
              ["EXPRESS", "Express"],
              ["STANDARD", "Standard"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onDeliveryMethodChange(value)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  deliveryMethod === value
                    ? "border-[#0f3460] bg-[#0f3460]/10 text-[#0f3460]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {savedAddresses.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Saved addresses</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {savedAddresses.map((saved) => (
              <button
                key={saved.id}
                type="button"
                onClick={() => {
                  onSelectSavedAddress(saved);
                  setFieldErrors({});
                }}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm transition hover:border-[#0f3460]/40 hover:bg-[#0f3460]/5"
              >
                <p className="font-semibold text-gray-800">{saved.fullName}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {saved.addressLine1}, {saved.city}, {saved.country}
                </p>
                {saved.isDefault ? (
                  <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide text-[#0f3460]">
                    Default
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-700">Contact details</p>
        <InputField
          label="Full Name"
          required
          type="text"
          placeholder="John Doe"
          value={contact.guestName}
          error={fieldErrors.guestName}
          onChange={(e) => {
            onContactChange({ guestName: sanitizeNameInput(e.target.value) });
            clearFieldError("guestName");
          }}
          onBlur={() => {
            const error = validateGuestName(contact.guestName);
            if (error) setFieldErrors((current) => ({ ...current, guestName: error }));
          }}
          autoFocus
        />
        <InputField
          label="Email Address"
          required
          type="email"
          placeholder="you@example.com"
          value={contact.guestEmail}
          error={fieldErrors.guestEmail}
          onChange={(e) => {
            onContactChange({ guestEmail: e.target.value });
            clearFieldError("guestEmail");
          }}
          onBlur={() => {
            const error = validateGuestEmail(contact.guestEmail);
            if (error) setFieldErrors((current) => ({ ...current, guestEmail: error }));
          }}
        />
        <InputField
          label="Phone Number"
          required
          type="tel"
          inputMode="numeric"
          placeholder="0701234567"
          value={contact.guestPhone}
          error={fieldErrors.guestPhone}
          onChange={(e) => {
            onContactChange({ guestPhone: sanitizePhoneInput(e.target.value) });
            clearFieldError("guestPhone");
          }}
          onBlur={() => {
            const error = validateGuestPhone(contact.guestPhone);
            if (error) setFieldErrors((current) => ({ ...current, guestPhone: error }));
          }}
        />
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-6">
        <p className="text-sm font-semibold text-gray-700">
          {addressRequired ? "Shipping address" : "Pickup details"}
        </p>
        {!addressRequired ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Pickup orders do not require a delivery address.
            {hasThirdPartyProducts && deliveryMethod === "PICKUP"
              ? " You can continue with contact details only."
              : ""}
          </div>
        ) : null}
        <InputField
          label="Street Address"
          required={addressRequired}
          type="text"
          placeholder="123 Main Street, Apt 4"
          value={address.addressLine1}
          error={fieldErrors.addressLine1}
          onChange={(e) => {
            onAddressChange({ addressLine1: e.target.value });
            clearFieldError("addressLine1");
          }}
          onBlur={() => {
            if (!addressRequired) return;
            const error = validateAddressLine(address.addressLine1);
            if (error) setFieldErrors((current) => ({ ...current, addressLine1: error }));
          }}
        />
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="City"
            required={addressRequired}
            type="text"
            placeholder="Kabul"
            value={address.city}
            error={fieldErrors.city}
            onChange={(e) => {
              onAddressChange({ city: sanitizeCityCountryInput(e.target.value) });
              clearFieldError("city");
            }}
            onBlur={() => {
              if (!addressRequired) return;
              const error = validateCity(address.city);
              if (error) setFieldErrors((current) => ({ ...current, city: error }));
            }}
          />
          <InputField
            label="Postal Code"
            type="text"
            inputMode="numeric"
            placeholder="1001"
            value={address.postalCode}
            error={fieldErrors.postalCode}
            onChange={(e) => {
              onAddressChange({ postalCode: sanitizePostalCodeInput(e.target.value) });
              clearFieldError("postalCode");
            }}
            onBlur={() => {
              const error = validatePostalCode(address.postalCode);
              if (error) setFieldErrors((current) => ({ ...current, postalCode: error }));
            }}
          />
        </div>
        <InputField
          label="Country"
          required={addressRequired}
          type="text"
          placeholder="Afghanistan"
          value={address.country}
          error={fieldErrors.country}
          onChange={(e) => {
            onAddressChange({ country: sanitizeCityCountryInput(e.target.value) });
            clearFieldError("country");
          }}
          onBlur={() => {
            if (!addressRequired) return;
            const error = validateCountry(address.country);
            if (error) setFieldErrors((current) => ({ ...current, country: error }));
          }}
        />
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f3460] text-white font-semibold py-3.5 hover:bg-[#0a2540] transition-colors"
      >
        <ArrowRight size={17} className="shrink-0" strokeWidth={2} />
        Continue to Delivery
      </button>
    </form>
  );
}

/* ─── Step 2: Delivery cost ──────────────────────────────────────────── */

function DeliveryCostStep({
  summary,
  hasThirdPartyProducts,
  deliveryMethod,
  onDeliveryMethodChange,
  loading,
  error,
  onRetry,
  onNext,
  onBack,
}: {
  summary: PriceSummary | null;
  hasThirdPartyProducts: boolean;
  deliveryMethod: DeliveryMethod;
  onDeliveryMethodChange: (method: DeliveryMethod) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const breakdown = summary?.deliveryBreakdown ?? [];
  const canContinue = Boolean(summary) && !loading && !error;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
        <Truck size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 space-y-1">
          <p className="font-semibold">How delivery is calculated</p>
          <p className="text-blue-800">
            {deliveryMethod === "PICKUP"
              ? "Pickup orders have no delivery fee for third-party vendors."
              : deliveryMethod === "EXPRESS"
                ? "Express delivery uses vendor-defined delivery rules."
                : "Standard delivery uses platform delivery rules for third-party vendors."}
          </p>
          {breakdown[0] ? (
            <p className="text-blue-700">
              Platform rate: {formatAmount(breakdown[0].baseFeeAmount, summary!.currency)} base +{" "}
              {formatAmount(breakdown[0].perKmRateAmount, summary!.currency)} per km
            </p>
          ) : null}
        </div>
      </div>

      {hasThirdPartyProducts ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Third-party delivery method</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([
              ["PICKUP", "Pickup"],
              ["EXPRESS", "Express"],
              ["STANDARD", "Standard"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onDeliveryMethodChange(value)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  deliveryMethod === value
                    ? "border-[#0f3460] bg-[#0f3460]/10 text-[#0f3460]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-semibold text-[#0f3460] underline"
          >
            Try again
          </button>
        </div>
      ) : breakdown.length > 0 ? (
        <div className="space-y-3">
          {breakdown.map((entry) => (
            <div
              key={entry.vendorProfileId}
              className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 space-y-2"
            >
              <div className="flex justify-between gap-3">
                <p className="font-semibold text-gray-800">{entry.vendorStoreName ?? "Vendor"}</p>
                <p className="font-bold text-[#0f3460]">
                  {formatAmount(entry.deliveryAmount, summary!.currency)}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {entry.distanceKm > 0
                  ? (
                    <>
                      <span className="font-semibold text-gray-800">{entry.distanceKm.toFixed(1)} km</span>{" "}
                      driving distance
                    </>
                    )
                  : "Method-based delivery fee"}
              </p>
              {entry.baseFeeAmount > 0 || entry.perKmRateAmount > 0 ? (
                <p className="text-xs text-gray-500">
                  {formatAmount(entry.baseFeeAmount, summary!.currency)} base +{" "}
                  {formatAmount(entry.perKmRateAmount, summary!.currency)}/km
                </p>
              ) : null}
            </div>
          ))}
          <div className="flex justify-between rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 px-4 py-3 text-sm font-semibold text-[#0f3460]">
            <span>Total delivery</span>
            <span>{formatAmount(summary!.deliveryAmount, summary!.currency)}</span>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-600 font-semibold py-3.5 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={17} className="shrink-0" strokeWidth={2} />
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0f3460] text-white font-semibold py-3.5 hover:bg-[#0a2540] transition-colors disabled:opacity-50"
        >
          <ArrowRight size={17} className="shrink-0" strokeWidth={2} />
          Continue to Payment
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Payment method ─────────────────────────────────────────── */

function PaymentMethodStep({
  stripeAvailable,
  quoteLoading,
  quoteError,
  canPlaceOrder,
  priceSummary,
  quote,
  stripeOptions,
  stripePromise,
  contact,
  address,
  deliveryMethod,
  addressRequired,
  cartItems,
  vendorCoupons,
  checkoutApiBase,
  useAuthCheckout,
  locale,
  couponEligibleVendors,
  checkoutOffers,
  couponInputs,
  couponFieldErrors,
  applyingCouponVendorId,
  hasUnappliedCouponInput,
  onCouponInputChange,
  onApplyCoupon,
  onRemoveCoupon,
  onRetryQuote,
  onBack,
  onSuccess,
}: {
  stripeAvailable: boolean;
  quoteLoading: boolean;
  quoteError: string | null;
  canPlaceOrder: boolean;
  priceSummary: PriceSummary | null;
  quote: QuoteSummary | null;
  stripeOptions: {
    clientSecret: string;
    locale: "auto" | "en";
    appearance: {
      theme: "stripe";
      variables: { colorPrimary: string; borderRadius: string; fontFamily: string };
    };
  } | null;
  stripePromise: ReturnType<typeof getStripePromise>;
  contact: ContactForm;
  address: AddressForm;
  deliveryMethod: DeliveryMethod;
  addressRequired: boolean;
  cartItems: Array<{ productId: string; quantity: number }>;
  vendorCoupons: VendorCouponEntry[];
  checkoutApiBase: string;
  useAuthCheckout: boolean;
  locale: string;
  couponEligibleVendors: CouponEligibleVendor[];
  checkoutOffers: CheckoutVendorOffer[];
  couponInputs: Record<string, string>;
  couponFieldErrors: Record<string, string>;
  applyingCouponVendorId: string | null;
  hasUnappliedCouponInput: boolean;
  onCouponInputChange: (vendorProfileId: string, value: string) => void;
  onApplyCoupon: (vendorProfileId: string) => void;
  onRemoveCoupon: (code: string, vendorProfileId: string) => void;
  onRetryQuote: () => void;
  onBack: () => void;
  onSuccess: (orderNumber: string) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">Card payment is required to place this order.</p>
      <PaymentMethodSelector stripeAvailable={stripeAvailable} />

      {couponEligibleVendors.length > 0 ? (
        <div className="space-y-4">
          {couponEligibleVendors.map((vendor) => {
            const vendorOffers = checkoutOffers.find(
              (offer) => offer.vendorProfileId === vendor.vendorProfileId
            );
            return (
              <CouponSection
                key={vendor.vendorProfileId}
                storeName={vendor.storeName}
                couponInput={couponInputs[vendor.vendorProfileId] ?? ""}
                onCouponInputChange={(value) => onCouponInputChange(vendor.vendorProfileId, value)}
                availableOffers={vendorOffers?.coupons ?? []}
                fieldError={couponFieldErrors[vendor.vendorProfileId]}
                appliedCoupons={(priceSummary?.appliedCoupons ?? quote?.appliedCoupons ?? []).filter(
                  (coupon) => coupon.vendorProfileId === vendor.vendorProfileId
                )}
                onApply={() => onApplyCoupon(vendor.vendorProfileId)}
                onRemove={(code) => onRemoveCoupon(code, vendor.vendorProfileId)}
                applying={applyingCouponVendorId === vendor.vendorProfileId}
              />
            );
          })}
        </div>
      ) : null}

      {quoteLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-gray-400" size={28} />
        </div>
      ) : null}

      {quoteError && !quoteLoading ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-red-500">{quoteError}</p>
          <button
            type="button"
            onClick={onRetryQuote}
            className="text-sm text-[#0f3460] underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {hasUnappliedCouponInput && !quoteLoading ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Apply your discount code or clear the field before continuing.
        </div>
      ) : null}

      {canPlaceOrder && quote && stripeOptions && stripePromise ? (
        <Elements stripe={stripePromise} options={stripeOptions}>
          <StripePayForm
            quote={quote}
            contact={contact}
            address={address}
            deliveryMethod={deliveryMethod}
            addressRequired={addressRequired}
            cartItems={cartItems}
            vendorCoupons={vendorCoupons}
            checkoutApiBase={checkoutApiBase}
            useAuthCheckout={useAuthCheckout}
            locale={locale}
            onBack={onBack}
            onSuccess={onSuccess}
          />
        </Elements>
      ) : null}
    </div>
  );
}

/* ─── Payment method selector ────────────────────────────────────────── */

function PaymentMethodSelector({ stripeAvailable }: { stripeAvailable: boolean }) {
  const cardOption = {
    id: "card" as const,
    label: "Credit / Debit Card",
    sub: stripeAvailable
      ? `Visa, Mastercard, Amex — ${STRIPE_CHECKOUT_CURRENCY_LABEL}`
      : "Stripe not configured — add keys to .env.local",
    icon: <CreditCard size={22} className="text-blue-600" />,
    disabled: !stripeAvailable,
  };
  const options = [cardOption];

  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={opt.disabled}
          className={`w-full flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all ${
            opt.disabled
              ? "opacity-40 cursor-not-allowed border-gray-100 bg-gray-50"
              : "border-[#0f3460] bg-[#0f3460]/5"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            opt.disabled ? "bg-gray-100" : "bg-white shadow-sm"
          }`}>
            {opt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
            "border-[#0f3460] bg-[#0f3460]"
          }`}>
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Card / Stripe payment form ─────────────────────────────────────── */

function StripePayForm({
  quote,
  contact,
  address,
  deliveryMethod,
  addressRequired,
  cartItems,
  vendorCoupons,
  checkoutApiBase,
  useAuthCheckout,
  locale,
  onBack,
  onSuccess,
}: {
  quote: QuoteSummary;
  contact: ContactForm;
  address: AddressForm;
  deliveryMethod: DeliveryMethod;
  addressRequired: boolean;
  cartItems: Array<{ productId: string; quantity: number }>;
  vendorCoupons: VendorCouponEntry[];
  checkoutApiBase: string;
  useAuthCheckout: boolean;
  locale: string;
  onBack: () => void;
  onSuccess: (orderNumber: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    const completeUrl = `${window.location.origin}/${locale}/checkout/complete`;
    const confirmPayload = {
      paymentIntentId: quote.paymentIntentId,
      checkoutContextToken: quote.checkoutContextToken,
      guestName: contact.guestName,
      guestEmail: contact.guestEmail,
      guestPhone: contact.guestPhone,
      ...(addressRequired
        ? {
            addressLine1: address.addressLine1,
            city: address.city,
            country: address.country,
            postalCode: address.postalCode,
          }
        : {}),
      deliveryMethod,
      currency: quote.currency,
      items: cartItems,
      vendorCoupons,
    };
    persistPendingCheckoutConfirmation({
      checkoutApiBase,
      useAuthCheckout,
      payload: confirmPayload,
    });
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: completeUrl,
          payment_method_data: {
            billing_details: {
              name: contact.guestName,
              email: contact.guestEmail,
              phone: contact.guestPhone,
              address: addressRequired
                ? {
                    line1: address.addressLine1,
                    city: address.city,
                    country: address.country,
                    postal_code: address.postalCode || undefined,
                  }
                : undefined,
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message ?? "Payment failed. Please try again.");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        const res = await postCheckout(
          `${checkoutApiBase}/confirm`,
          confirmPayload,
          useAuthCheckout
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error?.message ?? "Order could not be recorded. Please contact support.");
          return;
        }
        clearPendingCheckoutConfirmation(paymentIntent.id);
        onSuccess(data.data.orderNumber);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div className="rounded-xl border border-gray-200 p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} disabled={paying}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-600 font-semibold py-3.5 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <ArrowLeft size={17} className="shrink-0" strokeWidth={2} />
          Back
        </button>
        <button type="submit" disabled={!stripe || !elements || paying}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white font-semibold py-3.5 hover:bg-green-700 transition-colors disabled:opacity-60">
          {paying
            ? <><Loader2 size={17} className="animate-spin" /> Processing…</>
            : <><CreditCard size={17} /> Pay {formatAmount(quote.grandTotalAmount, quote.currency)}</>}
        </button>
      </div>
      <p className="text-center text-xs text-gray-400">
        Secured by Stripe · Your card details are never stored on our servers
      </p>
    </form>
  );
}

/* ─── Order Summary sidebar ──────────────────────────────────────────── */

function OrderSummary({
  summary,
  loading,
  deliveryError,
  isPaymentStep,
  hasPricedDelivery,
}: {
  summary: PriceSummary | null;
  loading: boolean;
  deliveryError?: string | null;
  isPaymentStep?: boolean;
  hasPricedDelivery?: boolean;
}) {
  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[120px]">
        <p className="text-sm text-gray-400">Your cart is empty.</p>
      </div>
    );
  }

  const hasDeliveryBreakdown = (summary.deliveryBreakdown?.length ?? 0) > 0;

  return (
    <div className="relative space-y-4">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : null}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Order Summary</p>
      <div className="space-y-3">
        {summary.lineItems.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            {item.productImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.productImage} alt={item.productName}
                className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Package size={16} className="text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
              <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
              {formatAmount(item.lineTotalAmount, item.currency)}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>{formatAmount(summary.subtotalAmount, summary.currency)}</span>
        </div>
        {hasDeliveryBreakdown ? (
          <div className="space-y-2">
            <div className="flex justify-between text-gray-500">
              <span>Delivery</span>
              <span>{formatAmount(summary.deliveryAmount, summary.currency)}</span>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2.5 space-y-2 text-xs text-gray-600">
              {summary.deliveryBreakdown!.map((entry) => (
                <div key={entry.vendorProfileId} className="space-y-0.5">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-gray-700 truncate">
                      {entry.vendorStoreName ?? "Vendor"}
                    </span>
                    <span className="font-semibold text-gray-800 flex-shrink-0">
                      {formatAmount(entry.deliveryAmount, summary.currency)}
                    </span>
                  </div>
                  <p>
                    {entry.distanceKm > 0
                      ? `${entry.distanceKm.toFixed(1)} km driving distance`
                      : "Method-based delivery fee"}
                    {entry.baseFeeAmount > 0 || entry.perKmRateAmount > 0
                      ? ` · ${formatAmount(entry.baseFeeAmount, summary.currency)} base + ${formatAmount(entry.perKmRateAmount, summary.currency)}/km`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : deliveryError ? (
          <div className="space-y-2">
            <div className="flex justify-between text-gray-500">
              <span>Delivery</span>
              <span className="text-red-500">Unavailable</span>
            </div>
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {deliveryError}
            </p>
          </div>
        ) : isPaymentStep && (loading || !hasPricedDelivery) ? (
          <div className="flex justify-between text-gray-500">
            <span>Delivery</span>
            <span className="text-gray-400">{loading ? "Calculating distance…" : "Waiting for address"}</span>
          </div>
        ) : (
          <div className="flex justify-between text-gray-500">
            <span>Delivery</span>
            <span>{summary.deliveryAmount === 0 ? "Calculated at payment" : formatAmount(summary.deliveryAmount, summary.currency)}</span>
          </div>
        )}
        {summary.discountAmount > 0 ? (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatAmount(summary.discountAmount, summary.currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold text-base text-[#0f3460] pt-2 border-t border-gray-100">
          <span>Total</span>
          <span>{formatAmount(summary.grandTotalAmount, summary.currency)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Success Screen ─────────────────────────────────────────────────── */

function SuccessScreen({
  orderNumber,
  guestEmail,
}: {
  orderNumber: string;
  guestEmail: string;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const signupHref = `/auth/signup?redirect=${encodeURIComponent("/account")}${guestEmail ? `&email=${encodeURIComponent(guestEmail)}` : ""}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Confirmation</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Order Placed!</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your payment was successful and the vendor has been notified.
          </p>
          {guestEmail ? (
            <p className="text-gray-500 mt-2 text-sm">
              A confirmation email has been sent to <strong>{guestEmail}</strong>.
            </p>
          ) : null}
        </div>

        <div className="bg-gray-50 rounded-2xl px-6 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Order Number</p>
          <p className="text-xl font-black text-[#0f3460] mt-1">{orderNumber}</p>
        </div>

        <p className="text-xs text-gray-400">Keep this order number for your records.</p>

        {!isAuthenticated ? (
          <div className="rounded-2xl border border-[#0f3460]/15 bg-[#0f3460]/5 px-5 py-4 text-left space-y-3">
            <p className="text-sm font-semibold text-[#0f3460]">Want to track this order?</p>
            <p className="text-sm text-gray-600">
              Create a free account with the same email to track this order, view status updates, and save addresses for next time.
            </p>
            <Link
              href={signupHref}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
            >
              Create account
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Already have an account? Sign in
            </Link>
          </div>
        ) : null}

        <button onClick={() => router.push("/")}
          className="w-full rounded-xl bg-[#0f3460] text-white font-semibold py-3.5 hover:bg-[#0a2540] transition-colors">
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

/* ─── Main Checkout Page ─────────────────────────────────────────────── */

export default function CheckoutPage() {
  const locale = useLocale();
  const { cart, removeItem } = useCart();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { currency } = useCurrency();

  const [step, setStep] = useState(0);
  const checkoutTopRef = useRef<HTMLDivElement>(null);
  const stripeAvailable = isStripeCheckoutConfigured();
  const [contact, setContact] = useState<ContactForm>({ guestName: "", guestEmail: "", guestPhone: "" });
  const [address, setAddress] = useState<AddressForm>({ addressLine1: "", city: "", country: "", postalCode: "" });
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("STANDARD");
  const [customerPrefillReady, setCustomerPrefillReady] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);

  // Stripe quote (only needed when card payment is selected)
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Price summary used for delivery and totals display.
  const [priceSummary, setPriceSummary] = useState<PriceSummary | null>(null);

  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string>("");
  const [couponInputs, setCouponInputs] = useState<Record<string, string>>({});
  const [vendorCoupons, setVendorCoupons] = useState<VendorCouponEntry[]>([]);
  const [couponFieldErrors, setCouponFieldErrors] = useState<Record<string, string>>({});
  const [checkoutOffers, setCheckoutOffers] = useState<CheckoutVendorOffer[]>([]);
  const [applyingCouponVendorId, setApplyingCouponVendorId] = useState<string | null>(null);
  const isCustomerCheckout = isAuthenticated && user?.role === "CUSTOMER";
  const checkoutApiBase = useMemo(
    () => getCheckoutApiBase(isCustomerCheckout),
    [isCustomerCheckout]
  );

  const cartItems = cart.items;
  const hasPlatformProducts = useMemo(
    () => cartItems.some((item) => item.sellerType === "PLATFORM"),
    [cartItems]
  );
  const hasThirdPartyProducts = useMemo(
    () => cartItems.some((item) => (item.sellerType ?? "THIRD_PARTY") === "THIRD_PARTY"),
    [cartItems]
  );
  const addressRequired = hasPlatformProducts || deliveryMethod !== "PICKUP";
  const cartItemsPayload = useMemo(
    () => cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    [cartItems]
  );

  const mapQuoteToSummary = (data: PriceSummary & Partial<QuoteSummary>): PriceSummary => ({
    subtotalAmount: data.subtotalAmount,
    deliveryAmount: data.deliveryAmount,
    discountAmount: data.discountAmount ?? 0,
    grandTotalAmount: data.grandTotalAmount,
    currency: data.currency,
    lineItems: data.lineItems,
    appliedCoupons: data.appliedCoupons ?? [],
    deliveryBreakdown: data.deliveryBreakdown,
  });

  useEffect(() => {
    if (cartItems.length === 0 && !successOrderNumber) {
      router.replace("/");
    }
  }, [cartItems.length, router, successOrderNumber]);

  useEffect(() => {
    checkoutTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user || user.role !== "CUSTOMER") {
      setCustomerPrefillReady(true);
      return;
    }

    let cancelled = false;

    setContact((prev) => ({
      guestName: prev.guestName || user.fullName,
      guestEmail: prev.guestEmail || user.email,
      guestPhone: prev.guestPhone || user.phone,
    }));

    void (async () => {
      try {
        const response = await fetchWithAuth("/api/customer/addresses");
        const addresses = await parseApiResponse<CustomerAddress[]>(response);
        if (cancelled) return;

        setSavedAddresses(addresses);
        const preferred = addresses.find((item) => item.isDefault) ?? addresses[0];
        if (preferred) {
          setContact((prev) => ({
            guestName: prev.guestName || preferred.fullName || user.fullName,
            guestEmail: prev.guestEmail || user.email,
            guestPhone: prev.guestPhone || preferred.phone || user.phone,
          }));
          setAddress((prev) => ({
            addressLine1: prev.addressLine1 || preferred.addressLine1,
            city: prev.city || preferred.city,
            country: prev.country || preferred.country,
            postalCode: prev.postalCode || preferred.postalCode || "",
          }));
        }
      } catch {
      } finally {
        if (!cancelled) setCustomerPrefillReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user]);

  const awaitingCustomerPrefill =
    !authLoading &&
    isAuthenticated &&
    user?.role === "CUSTOMER" &&
    !customerPrefillReady;

  const fetchStripeQuote = useCallback(async (coupons: VendorCouponEntry[]) => {
    if (cartItems.length === 0) return;
    if (addressRequired && !isDeliveryAddressComplete(address)) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await postCheckout(
        `${checkoutApiBase}/intent`,
        buildGuestCheckoutRequestBody(
          cartItemsPayload,
          currency,
          coupons,
          contact.guestEmail,
          address,
          deliveryMethod,
          addressRequired
        ),
        isCustomerCheckout
      );
      const data = await parseApiResponse<QuoteSummary>(res);
      setQuote(data);
      setPriceSummary(mapQuoteToSummary(data));
    } catch (error) {
      setQuoteError(
        error instanceof Error ? error.message : "Could not load pricing. Please try again."
      );
    } finally {
      setQuoteLoading(false);
    }
  }, [address, addressRequired, cartItems.length, cartItemsPayload, checkoutApiBase, contact.guestEmail, currency, deliveryMethod, isCustomerCheckout]);

  const fetchPricing = useCallback(async (coupons: VendorCouponEntry[]) => {
    if (cartItems.length === 0) return;
    if (addressRequired && !isDeliveryAddressComplete(address)) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await postCheckout(
        `${checkoutApiBase}/pricing`,
        buildGuestCheckoutRequestBody(
          cartItemsPayload,
          currency,
          coupons,
          contact.guestEmail,
          address,
          deliveryMethod,
          addressRequired
        ),
        isCustomerCheckout
      );
      const data = await parseApiResponse<PriceSummary>(res);
      setPriceSummary(mapQuoteToSummary(data));
    } catch (error) {
      setQuoteError(
        error instanceof Error ? error.message : "Could not load pricing. Please try again."
      );
    } finally {
      setQuoteLoading(false);
    }
  }, [address, addressRequired, cartItems.length, cartItemsPayload, checkoutApiBase, contact.guestEmail, currency, deliveryMethod, isCustomerCheckout]);

  const refreshPricing = useCallback(
    async (coupons: VendorCouponEntry[]) => {
      if (stripeAvailable) {
        await fetchStripeQuote(coupons);
      }
    },
    [stripeAvailable, fetchStripeQuote]
  );

  const handleApplyCoupon = async (vendorProfileId: string) => {
    const code = (couponInputs[vendorProfileId] ?? "").trim().toUpperCase();
    if (!code) return;

    if (
      vendorCoupons.some(
        (entry) => entry.code === code && entry.vendorProfileId === vendorProfileId
      )
    ) {
      toast.error("This coupon is already applied.");
      return;
    }

    const nextCoupons = [...vendorCoupons, { code, vendorProfileId }];
    setApplyingCouponVendorId(vendorProfileId);
    setQuoteError(null);
    setCouponFieldErrors((current) => ({ ...current, [vendorProfileId]: "" }));

    try {
      const res = await postCheckout(
        `${checkoutApiBase}/intent`,
        buildGuestCheckoutRequestBody(
          cartItemsPayload,
          currency,
          nextCoupons,
          contact.guestEmail,
          address,
          deliveryMethod,
          addressRequired
        ),
        isCustomerCheckout
      );
      const data = await parseApiResponse<PriceSummary & Partial<QuoteSummary>>(res);
      const summary = mapQuoteToSummary(data);
      const applied = summary.appliedCoupons.some(
        (coupon) => coupon.code === code && coupon.vendorProfileId === vendorProfileId
      );

      if (!applied) {
        const message = `Coupon "${code}" is not valid for ${couponEligibleVendors.find((v) => v.vendorProfileId === vendorProfileId)?.storeName ?? "this store"}.`;
        setCouponFieldErrors((current) => ({ ...current, [vendorProfileId]: message }));
        toast.error(message);
        return;
      }

      setVendorCoupons(nextCoupons);
      setCouponInputs((current) => ({ ...current, [vendorProfileId]: "" }));
      setPriceSummary(summary);
      setQuote(data as QuoteSummary);
      toast.success(`Coupon ${code} applied`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not apply coupon.";
      setCouponFieldErrors((current) => ({ ...current, [vendorProfileId]: message }));
      toast.error(message);
    } finally {
      setApplyingCouponVendorId(null);
    }
  };

  const handleRemoveCoupon = async (code: string, vendorProfileId: string) => {
    const nextCoupons = vendorCoupons.filter(
      (entry) => !(entry.code === code && entry.vendorProfileId === vendorProfileId)
    );
    setVendorCoupons(nextCoupons);
    setQuoteError(null);
    setCouponFieldErrors((current) => ({ ...current, [vendorProfileId]: "" }));
    await refreshPricing(nextCoupons);
  };

  const stripeOptions = useMemo(
    () =>
      quote?.clientSecret
        ? {
            clientSecret: quote.clientSecret,
            locale: getStripeCheckoutLocale(locale),
            appearance: {
              theme: "stripe" as const,
              variables: { colorPrimary: "#0f3460", borderRadius: "12px", fontFamily: "inherit" },
            },
          }
        : null,
    [quote?.clientSecret, locale]
  );

  const handleSuccess = useCallback(
    (orderNumber: string) => {
      localStorage.removeItem("onlinemandawee-cart");
      cart.items.forEach((item) => removeItem(item.id));
      setSuccessEmail(contact.guestEmail);
      setSuccessOrderNumber(orderNumber);
    },
    [cart.items, removeItem, contact.guestEmail]
  );

  const handleSelectSavedAddress = (saved: CustomerAddress) => {
    setContact((prev) => ({
      guestName: saved.fullName || prev.guestName,
      guestPhone: saved.phone || prev.guestPhone,
      guestEmail: prev.guestEmail,
    }));
    setAddress({
      addressLine1: saved.addressLine1,
      city: saved.city,
      country: saved.country,
      postalCode: saved.postalCode ?? "",
    });
    setPriceSummary(null);
    setQuote(null);
    setQuoteError(null);
  };

  const cartPreviewSummary = useMemo((): PriceSummary | null => {
    if (cartItems.length === 0) return null;

    const lineItems: LineItem[] = cartItems.map((item) => {
      const nativeCurrency = item.productCurrency ?? "USD";
      const unitPriceAmount = Math.round(
        convertMajorUnits(item.productPrice, nativeCurrency, currency) * 100
      );

      return {
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage || null,
        productSku: null,
        vendorProfileId: item.vendorProfileId ?? "",
        categoryId: "",
        quantity: item.quantity,
        unitPriceAmount,
        lineTotalAmount: unitPriceAmount * item.quantity,
        currency,
      };
    });

    const subtotalAmount = lineItems.reduce((sum, item) => sum + item.lineTotalAmount, 0);

    return {
      subtotalAmount,
      deliveryAmount: 0,
      discountAmount: 0,
      grandTotalAmount: subtotalAmount,
      currency,
      lineItems,
      appliedCoupons: [],
    };
  }, [cartItems, currency]);

  const displaySummary =
    priceSummary ??
    (quote ? mapQuoteToSummary(quote) : null) ??
    cartPreviewSummary;

  const couponEligibleVendors = useMemo<CouponEligibleVendor[]>(() => {
    const vendors = new Map<string, string>();

    for (const item of cartItems) {
      if (item.isVendorProduct === false) continue;
      if (item.isVendorProduct && item.vendorProfileId) {
        vendors.set(item.vendorProfileId, item.vendor);
      }
    }

    for (const lineItem of displaySummary?.lineItems ?? []) {
      const cartItem = cartItems.find((item) => item.productId === lineItem.productId);
      if (cartItem?.isVendorProduct === false) continue;

      const isMarketplaceItem =
        cartItem?.isVendorProduct === true ||
        (cartItem != null &&
          cartItem.isVendorProduct !== false &&
          /^[a-f0-9]{24}$/i.test(cartItem.productId));

      if (!isMarketplaceItem) continue;

      const storeName =
        displaySummary?.appliedCoupons.find(
          (coupon) => coupon.vendorProfileId === lineItem.vendorProfileId
        )?.vendorStoreName ??
        cartItem?.vendor ??
        "Vendor";
      vendors.set(lineItem.vendorProfileId, storeName);
    }

    return Array.from(vendors, ([vendorProfileId, storeName]) => ({
      vendorProfileId,
      storeName,
    }));
  }, [cartItems, displaySummary]);

  useEffect(() => {
    if (step !== 1) return;
    if (addressRequired && !isDeliveryAddressComplete(address)) return;
    void fetchPricing(vendorCoupons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currency, deliveryMethod, addressRequired, address.addressLine1, address.city, address.country, address.postalCode]);

  useEffect(() => {
    if (step !== 2) return;
    void refreshPricing(vendorCoupons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stripeAvailable, currency]);

  useEffect(() => {
    if (step !== 2 || couponEligibleVendors.length === 0) return;

    void fetch("/api/checkout/guest/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorProfileIds: couponEligibleVendors.map((vendor) => vendor.vendorProfileId),
      }),
    })
      .then(async (res) => parseApiResponse<CheckoutVendorOffer[]>(res))
      .then(setCheckoutOffers)
      .catch(() => setCheckoutOffers([]));
  }, [step, couponEligibleVendors]);

  const hasUnappliedCouponInput = useMemo(() => {
    return couponEligibleVendors.some((vendor) => {
      const code = (couponInputs[vendor.vendorProfileId] ?? "").trim().toUpperCase();
      if (!code) return false;
      return !vendorCoupons.some(
        (entry) => entry.code === code && entry.vendorProfileId === vendor.vendorProfileId
      );
    });
  }, [couponEligibleVendors, couponInputs, vendorCoupons]);

  const canPlaceOrder =
    Boolean(displaySummary) && !quoteLoading && !quoteError && !hasUnappliedCouponInput;

  if (successOrderNumber) {
    return (
      <SuccessScreen
        orderNumber={successOrderNumber}
        guestEmail={successEmail}
      />
    );
  }

  if (awaitingCustomerPrefill) {
    return <PageLoader message="Loading checkout..." fullScreen />;
  }

  const stepIcons = [
    <MapPin key="s" size={18} />,
    <Truck key="d" size={18} />,
    <CreditCard key="p" size={18} />,
    <ClipboardList key="r" size={18} />,
  ];

  return (
    <div ref={checkoutTopRef} className="min-h-screen scroll-mt-28 bg-gray-50 sm:scroll-mt-32">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <ShoppingBag size={20} className="text-[#0f3460]" />
          <span className="font-bold text-[#0f3460] text-lg">Checkout</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left: steps */}
        <div className="space-y-6">
          {/* Step indicators */}
          <div className="flex items-center gap-0">
            {STEP_LABELS.map((label, idx) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    idx < step ? "bg-green-500 text-white" : idx === step ? "bg-[#0f3460] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {idx < step ? <CheckCircle size={18} /> : stepIcons[idx]}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${idx === step ? "text-[#0f3460]" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`h-px flex-1 mx-3 ${idx < step ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#0f3460] mb-6">
              {STEP_LABELS[step]}
              <span className="ml-2 text-sm font-normal text-gray-400">
                Step {step + 1} of {STEP_LABELS.length}
              </span>
            </h2>

            {step === 0 && (
              <ShippingAddressStep
                contact={contact}
                address={address}
                addressRequired={addressRequired}
                hasThirdPartyProducts={hasThirdPartyProducts}
                deliveryMethod={deliveryMethod}
                onDeliveryMethodChange={setDeliveryMethod}
                savedAddresses={savedAddresses}
                onContactChange={(f) => setContact((prev) => ({ ...prev, ...f }))}
                onAddressChange={(f) => setAddress((prev) => ({ ...prev, ...f }))}
                onSelectSavedAddress={handleSelectSavedAddress}
                onNext={() => setStep(1)}
              />
            )}

            {step === 1 && (
              <DeliveryCostStep
                summary={priceSummary}
                hasThirdPartyProducts={hasThirdPartyProducts}
                deliveryMethod={deliveryMethod}
                onDeliveryMethodChange={(method) => {
                  setDeliveryMethod(method);
                  setPriceSummary(null);
                  setQuote(null);
                  setQuoteError(null);
                }}
                loading={quoteLoading}
                error={quoteError}
                onRetry={() => void fetchPricing(vendorCoupons)}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}

            {step === 2 && (
              <PaymentMethodStep
                stripeAvailable={stripeAvailable}
                quoteLoading={quoteLoading}
                quoteError={quoteError}
                canPlaceOrder={canPlaceOrder}
                priceSummary={priceSummary}
                quote={quote}
                stripeOptions={stripeOptions}
                stripePromise={stripePromise}
                contact={contact}
                address={address}
                deliveryMethod={deliveryMethod}
                addressRequired={addressRequired}
                cartItems={cartItemsPayload}
                vendorCoupons={vendorCoupons}
                checkoutApiBase={checkoutApiBase}
                useAuthCheckout={isCustomerCheckout}
                locale={locale}
                couponEligibleVendors={couponEligibleVendors}
                checkoutOffers={checkoutOffers}
                couponInputs={couponInputs}
                couponFieldErrors={couponFieldErrors}
                applyingCouponVendorId={applyingCouponVendorId}
                hasUnappliedCouponInput={hasUnappliedCouponInput}
                onCouponInputChange={(vendorProfileId, value) => {
                  setCouponInputs((current) => ({
                    ...current,
                    [vendorProfileId]: value,
                  }));
                  setCouponFieldErrors((current) => ({
                    ...current,
                    [vendorProfileId]: "",
                  }));
                }}
                onApplyCoupon={(vendorProfileId) => void handleApplyCoupon(vendorProfileId)}
                onRemoveCoupon={(code, vendorProfileId) =>
                  void handleRemoveCoupon(code, vendorProfileId)
                }
                onRetryQuote={() => void refreshPricing(vendorCoupons)}
                onBack={() => setStep(1)}
                onSuccess={handleSuccess}
              />
            )}
          </div>

        </div>

        {/* Right: order summary */}
        <div className="lg:sticky lg:top-8 self-start">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <OrderSummary
              summary={displaySummary}
              loading={(step === 1 || step === 2) && quoteLoading}
              deliveryError={step >= 1 ? quoteError : null}
              isPaymentStep={step >= 1}
              hasPricedDelivery={Boolean(priceSummary)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
