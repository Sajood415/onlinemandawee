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
  Truck,
  X,
  ChevronRight,
} from "lucide-react";

import { AddressAutocompleteInput } from "@/components/address/AddressAutocompleteInput";
import { PageLoader } from "@/components/ui/PageLoader";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  getCitiesForCountryName,
  getPostalCodesForCity,
  normalizeCityNameForCountry,
  normalizeCountryName,
  normalizePostalCodeForCity,
  SHIPPING_COUNTRIES,
} from "@/lib/geo/shipping-locations";
import { convertMajorUnits } from "@/lib/currency/convert";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  confirmCheckoutOrderWithRetry,
  waitForSucceededPaymentIntent,
} from "@/lib/checkout/client-checkout-confirmation";
import {
  sanitizeCityCountryInput,
  sanitizeNameInput,
  sanitizePhoneInput,
  sanitizePostalCodeInput,
} from "@/lib/checkout/checkout-field-validation";
import {
  createCheckoutValidators,
  useCheckoutCopy,
  type CheckoutCopy,
} from "@/lib/i18n/use-checkout-copy";
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
  contact: ContactForm,
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
    guestName: contact.guestName,
    guestEmail: contact.guestEmail,
    guestPhone: contact.guestPhone,
    checkoutGuestEmail,
  };

  if (addressRequired && isDeliveryAddressComplete(address)) {
    const trimmedAddress = {
      addressLine1: address.addressLine1.trim(),
      city: address.city.trim(),
      country: address.country.trim(),
      postalCode: address.postalCode.trim(),
    };
    body.deliveryAddress = trimmedAddress;
    Object.assign(body, trimmedAddress);
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

function formatAmount(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
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
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
        {required ? <span className="ms-0.5 text-red-500">*</span> : null}
      </label>
      <input
        {...props}
        className={`w-full border-0 border-b bg-transparent px-0 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 disabled:text-neutral-400 ${
          error
            ? "border-red-400 focus:border-red-500"
            : "border-neutral-300 focus:border-[#0F3460]"
        }`}
      />
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

/* ─── Coupon input ───────────────────────────────────────────────────── */

function CouponSection({
  copy,
  storeName,
  couponInput,
  onCouponInputChange,
  appliedCoupons,
  availableOffers,
  fieldError,
  onApply,
  onRemove,
  applying,
  locale,
}: {
  copy: CheckoutCopy;
  storeName: string;
  couponInput: string;
  onCouponInputChange: (value: string) => void;
  appliedCoupons: AppliedCouponSummary[];
  availableOffers: Array<{ code: string; label: string }>;
  fieldError?: string;
  onApply: () => void;
  onRemove: (code: string) => void;
  applying: boolean;
  locale: string;
}) {
  return (
    <div className="space-y-3 border-t border-neutral-200 pt-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {copy.coupon.discountFor(storeName)}
      </p>
      {availableOffers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableOffers.map((offer) => (
            <button
              key={offer.code}
              type="button"
              onClick={() => onCouponInputChange(offer.code)}
              className="border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-[#0F3460] transition hover:border-[#0F3460]"
            >
              {offer.code}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <input
            value={couponInput}
            onChange={(event) => onCouponInputChange(event.target.value.toUpperCase())}
            placeholder={copy.coupon.placeholder}
            className={`w-full border-0 border-b bg-transparent px-0 py-2.5 text-sm uppercase text-neutral-900 outline-none transition placeholder:text-neutral-400 ${
              fieldError
                ? "border-red-400 focus:border-red-500"
                : "border-neutral-300 focus:border-[#0F3460]"
            }`}
          />
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={applying || !couponInput.trim()}
          className="shrink-0 bg-[#0F3460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-50"
        >
          {applying ? copy.common.applying : copy.common.apply}
        </button>
      </div>
      {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
      {appliedCoupons.length > 0 ? (
        <div className="space-y-2">
          {appliedCoupons.map((coupon) => (
            <div
              key={coupon.code}
              className="flex items-center justify-between border-b border-neutral-100 py-2 text-sm"
            >
              <div>
                <p className="font-semibold text-emerald-800">{coupon.code}</p>
                <p className="text-xs text-neutral-500">
                  -{formatAmount(coupon.discountAmount, "USD", locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(coupon.code)}
                className="p-1.5 text-neutral-500 transition hover:text-red-600"
                aria-label={copy.coupon.removeCoupon(coupon.code)}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Step 1: Shipping address ─────────────────────────────────────── */

type ShippingFieldErrors = Partial<
  Record<keyof ContactForm | keyof AddressForm, string>
>;

function ShippingAddressStep({
  copy,
  validators,
  locale,
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
  copy: CheckoutCopy;
  validators: ReturnType<typeof createCheckoutValidators>;
  locale: string;
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

  const countryOptions = useMemo(
    () =>
      SHIPPING_COUNTRIES.map((country) => ({
        value: country.name,
        label: `${country.flag} ${country.name}`,
      })),
    []
  );

  const cityOptions = useMemo(
    () =>
      getCitiesForCountryName(address.country).map((city) => ({
        value: city.name,
        label: city.name,
      })),
    [address.country]
  );

  const postalOptions = useMemo(
    () =>
      getPostalCodesForCity(address.country, address.city).map((postal) => ({
        value: postal,
        label: postal,
      })),
    [address.country, address.city]
  );

  const shippingCountryIsoCodes = useMemo(
    () => SHIPPING_COUNTRIES.map((country) => country.iso),
    []
  );

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
    const errors = validators.validateCheckoutShippingForm(contact, address, {
      addressRequired,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(copy.shipping.fixFields);
      return;
    }
    setFieldErrors({});
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasThirdPartyProducts ? (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {copy.deliveryMethod.title}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([
              ["PICKUP", copy.deliveryMethod.pickup],
              ["EXPRESS", copy.deliveryMethod.express],
              ["STANDARD", copy.deliveryMethod.standard],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onDeliveryMethodChange(value)}
                className={`border px-3 py-2.5 text-sm font-semibold transition ${
                  deliveryMethod === value
                    ? "border-[#0F3460] bg-[#0F3460] text-white"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {addressRequired && savedAddresses.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {copy.shipping.savedAddresses}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {savedAddresses.map((saved) => (
              <button
                key={saved.id}
                type="button"
                onClick={() => {
                  onSelectSavedAddress(saved);
                  setFieldErrors({});
                }}
                className="border border-neutral-200 px-4 py-3 text-left text-sm transition hover:border-[#0F3460]"
              >
                <p className="font-semibold text-neutral-800">{saved.fullName}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {saved.addressLine1}, {saved.city}, {saved.country}
                </p>
                {saved.isDefault ? (
                  <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide text-[#0F3460]">
                    {copy.common.default}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {copy.shipping.contactDetails}
        </p>
        <InputField
          label={copy.contact.fullName}
          required
          type="text"
          placeholder={copy.contact.fullNamePlaceholder}
          value={contact.guestName}
          error={fieldErrors.guestName}
          onChange={(e) => {
            onContactChange({ guestName: sanitizeNameInput(e.target.value) });
            clearFieldError("guestName");
          }}
          onBlur={() => {
            const error = validators.validateGuestName(contact.guestName);
            if (error) setFieldErrors((current) => ({ ...current, guestName: error }));
          }}
          autoFocus
        />
        <InputField
          label={copy.contact.email}
          required
          type="email"
          placeholder={copy.contact.emailPlaceholder}
          value={contact.guestEmail}
          error={fieldErrors.guestEmail}
          onChange={(e) => {
            onContactChange({ guestEmail: e.target.value });
            clearFieldError("guestEmail");
          }}
          onBlur={() => {
            const error = validators.validateGuestEmail(contact.guestEmail);
            if (error) setFieldErrors((current) => ({ ...current, guestEmail: error }));
          }}
        />
        <InputField
          label={copy.contact.phone}
          required
          type="tel"
          inputMode="numeric"
          placeholder={copy.contact.phonePlaceholder}
          value={contact.guestPhone}
          error={fieldErrors.guestPhone}
          onChange={(e) => {
            onContactChange({ guestPhone: sanitizePhoneInput(e.target.value) });
            clearFieldError("guestPhone");
          }}
          onBlur={() => {
            const error = validators.validateGuestPhone(contact.guestPhone);
            if (error) setFieldErrors((current) => ({ ...current, guestPhone: error }));
          }}
        />
      </div>

      {addressRequired ? (
        <div className="space-y-4 border-t border-neutral-200 pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {copy.shipping.shippingAddress}
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {copy.address.street}
              <span className="ms-0.5 text-red-500">*</span>
            </label>
            <AddressAutocompleteInput
              className={`w-full border-0 border-b bg-transparent px-0 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 disabled:text-neutral-400 ${
                fieldErrors.addressLine1
                  ? "border-red-400 focus:border-red-500"
                  : "border-neutral-300 focus:border-[#0F3460]"
              }`}
              placeholder={copy.address.streetPlaceholder}
              value={address.addressLine1}
              countryCodes={shippingCountryIsoCodes}
              onTextChange={(value) => {
                onAddressChange({ addressLine1: value });
                clearFieldError("addressLine1");
              }}
              onPlaceSelect={(place) => {
                const matchedCountry = place.country ? normalizeCountryName(place.country) : "";
                const matchedCity =
                  matchedCountry && place.city
                    ? normalizeCityNameForCountry(matchedCountry, place.city)
                    : "";
                const matchedPostal =
                  matchedCountry && matchedCity && place.postalCode
                    ? normalizePostalCodeForCity(matchedCountry, matchedCity, place.postalCode)
                    : "";
                onAddressChange({
                  addressLine1: place.addressLine1,
                  ...(matchedCountry
                    ? { country: matchedCountry, city: matchedCity, postalCode: matchedPostal }
                    : {}),
                });
                clearFieldError("addressLine1");
              }}
              onBlur={() => {
                const error = validators.validateAddressLine(address.addressLine1);
                if (error) setFieldErrors((current) => ({ ...current, addressLine1: error }));
              }}
            />
            {fieldErrors.addressLine1 ? (
              <p className="mt-1.5 text-xs text-red-600">{fieldErrors.addressLine1}</p>
            ) : null}
          </div>
          <SearchableSelect
            variant="underline"
            label={copy.address.country}
            required
            value={address.country}
            options={countryOptions}
            placeholder={copy.address.selectCountry}
            searchPlaceholder={copy.address.searchCountries}
            error={fieldErrors.country}
            onChange={(value) => {
              onAddressChange({ country: value, city: "", postalCode: "" });
              setFieldErrors((current) => {
                const next = { ...current };
                const countryError = validators.validateCountry(value);
                if (countryError) next.country = countryError;
                else delete next.country;
                delete next.city;
                delete next.postalCode;
                return next;
              });
            }}
            onBlur={() => {
              const error = validators.validateCountry(address.country);
              if (error) setFieldErrors((current) => ({ ...current, country: error }));
            }}
            emptyMessage={copy.address.noCountries}
          />
          <SearchableSelect
            variant="underline"
            label={copy.address.city}
            required
            value={address.city}
            options={cityOptions}
            placeholder={address.country ? copy.address.selectCity : copy.address.selectCountryFirst}
            searchPlaceholder={copy.address.searchCities}
            error={fieldErrors.city}
            disabled={!address.country}
            allowCustom
            onChange={(value) => {
              const city = sanitizeCityCountryInput(value);
              onAddressChange({ city, postalCode: "" });
              setFieldErrors((current) => {
                const next = { ...current };
                const cityError = validators.validateCity(city);
                if (cityError) next.city = cityError;
                else delete next.city;
                delete next.postalCode;
                return next;
              });
            }}
            onBlur={() => {
              const error = validators.validateCity(address.city);
              if (error) setFieldErrors((current) => ({ ...current, city: error }));
            }}
            emptyMessage={
              address.country ? copy.address.noCities : copy.address.chooseCountryFirst
            }
          />
          <SearchableSelect
            variant="underline"
            label={copy.address.postalCode}
            value={address.postalCode}
            options={postalOptions}
            placeholder={address.city ? copy.address.selectPostal : copy.address.selectCityFirst}
            searchPlaceholder={copy.address.searchPostal}
            error={fieldErrors.postalCode}
            disabled={!address.city}
            allowCustom
            onChange={(value) => {
              const postalCode = sanitizePostalCodeInput(value);
              onAddressChange({ postalCode });
              clearFieldError("postalCode");
            }}
            onBlur={() => {
              const error = validators.validatePostalCode(address.postalCode);
              if (error) setFieldErrors((current) => ({ ...current, postalCode: error }));
            }}
            emptyMessage={
              address.city ? copy.address.noPostal : copy.address.chooseCityFirst
            }
          />
        </div>
      ) : null}

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 bg-[#0F3460] py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
      >
        <ArrowRight size={17} className="shrink-0" strokeWidth={2} />
        {copy.shipping.continueToDelivery}
      </button>
    </form>
  );
}

/* ─── Step 2: Delivery cost ──────────────────────────────────────────── */

function DeliveryCostStep({
  copy,
  locale,
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
  copy: CheckoutCopy;
  locale: string;
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
    <div className="space-y-7">
      {hasThirdPartyProducts ? (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {copy.deliveryMethod.title}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([
              ["PICKUP", copy.deliveryMethod.pickup],
              ["EXPRESS", copy.deliveryMethod.express],
              ["STANDARD", copy.deliveryMethod.standard],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onDeliveryMethodChange(value)}
                className={`border px-3 py-2.5 text-sm font-semibold transition ${
                  deliveryMethod === value
                    ? "border-[#0F3460] bg-[#0F3460] text-white"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
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
          <Loader2 className="animate-spin text-neutral-400" size={28} />
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 px-4 py-4 text-center space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-semibold text-[#0F3460] underline"
          >
            {copy.common.tryAgain}
          </button>
        </div>
      ) : summary ? (
        <div className="space-y-3 border-t border-neutral-200 pt-5">
          {breakdown.map((entry) => (
            <div
              key={entry.vendorProfileId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <p className="truncate text-neutral-600">
                {entry.vendorStoreName ?? copy.common.vendor}
              </p>
              <p className="shrink-0 font-semibold text-neutral-900">
                {formatAmount(entry.deliveryAmount, summary.currency, locale)}
              </p>
            </div>
          ))}
          <div className="flex justify-between border-t border-neutral-200 pt-3 text-sm font-semibold text-neutral-900">
            <span>{copy.delivery.totalDelivery}</span>
            <span>{formatAmount(summary.deliveryAmount, summary.currency, locale)}</span>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 border-t border-neutral-200 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex flex-1 items-center justify-center gap-2 border border-neutral-300 py-3.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
        >
          <ArrowLeft size={17} className="shrink-0" strokeWidth={2} />
          {copy.common.back}
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className="flex flex-1 items-center justify-center gap-2 bg-[#0F3460] py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-50"
        >
          <ArrowRight size={17} className="shrink-0" strokeWidth={2} />
          {copy.delivery.continueToPayment}
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Payment method ─────────────────────────────────────────── */

function PaymentMethodStep({
  copy,
  locale,
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
  onPaymentElementReady,
}: {
  copy: CheckoutCopy;
  locale: string;
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
  onPaymentElementReady?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {copy.payment.card}
        </p>
        <p className="text-sm text-neutral-600">
          {stripeAvailable
            ? copy.payment.cardSub(STRIPE_CHECKOUT_CURRENCY_LABEL)
            : copy.payment.cardUnavailable}
        </p>
      </div>

      {couponEligibleVendors.length > 0 ? (
        <div className="space-y-4">
          {couponEligibleVendors.map((vendor) => {
            const vendorOffers = checkoutOffers.find(
              (offer) => offer.vendorProfileId === vendor.vendorProfileId
            );
            return (
              <CouponSection
                key={vendor.vendorProfileId}
                copy={copy}
                locale={locale}
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
          <Loader2 className="animate-spin text-neutral-400" size={28} />
        </div>
      ) : null}

      {quoteError && !quoteLoading ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-red-600">{quoteError}</p>
          <button
            type="button"
            onClick={onRetryQuote}
            className="text-sm font-semibold text-[#0F3460] underline"
          >
            {copy.common.tryAgain}
          </button>
        </div>
      ) : null}

      {hasUnappliedCouponInput && !quoteLoading ? (
        <p className="text-sm text-neutral-600">{copy.payment.applyCouponFirst}</p>
      ) : null}

      {canPlaceOrder && quote && stripeOptions && stripePromise ? (
        <Elements stripe={stripePromise} options={stripeOptions}>
          <StripePayForm
            copy={copy}
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
            onPaymentElementReady={onPaymentElementReady}
          />
        </Elements>
      ) : null}
    </div>
  );
}

/* ─── Card / Stripe payment form ─────────────────────────────────────── */

function StripePayForm({
  copy,
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
  onPaymentElementReady,
}: {
  copy: CheckoutCopy;
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
  onPaymentElementReady?: () => void;
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

      const succeededPaymentIntent = await waitForSucceededPaymentIntent(
        stripe,
        quote.clientSecret,
        paymentIntent
      );

      if (!succeededPaymentIntent) {
        toast.error(error?.message ?? copy.errors.paymentFailed);
        return;
      }

      const confirmed = await confirmCheckoutOrderWithRetry({
        confirmPath: `${checkoutApiBase}/confirm`,
        payload: confirmPayload,
        useAuthCheckout,
        postCheckout,
      });
      clearPendingCheckoutConfirmation(succeededPaymentIntent.id);
      onSuccess(confirmed.orderNumber);
    } catch (confirmError) {
      toast.error(
        confirmError instanceof Error
          ? confirmError.message
          : copy.errors.generic
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div className="border border-neutral-200 p-4">
        <PaymentElement
          onReady={onPaymentElementReady}
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />
      </div>
      <div className="flex gap-3 border-t border-neutral-200 pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={paying}
          className="flex flex-1 items-center justify-center gap-2 border border-neutral-300 py-3.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50"
        >
          <ArrowLeft size={17} className="shrink-0" strokeWidth={2} />
          {copy.common.back}
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || paying}
          className="flex flex-1 items-center justify-center gap-2 bg-[#0F3460] py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-60"
        >
          {paying ? (
            <>
              <Loader2 size={17} className="animate-spin" /> {copy.common.processing}
            </>
          ) : (
            <>
              <CreditCard size={17} />{" "}
              {copy.payment.pay(formatAmount(quote.grandTotalAmount, quote.currency, locale))}
            </>
          )}
        </button>
      </div>
      <p className="text-center text-xs text-neutral-400">{copy.payment.securedByStripe}</p>
    </form>
  );
}

/* ─── Order Summary sidebar ──────────────────────────────────────────── */

function OrderSummary({
  copy,
  locale,
  summary,
  loading,
  deliveryError,
  isPaymentStep,
  hasPricedDelivery,
}: {
  copy: CheckoutCopy;
  locale: string;
  summary: PriceSummary | null;
  loading: boolean;
  deliveryError?: string | null;
  isPaymentStep?: boolean;
  hasPricedDelivery?: boolean;
}) {
  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[120px]">
        <p className="text-sm text-gray-400">{copy.summary.emptyCart}</p>
      </div>
    );
  }

  const hasDeliveryBreakdown = (summary.deliveryBreakdown?.length ?? 0) > 0;

  return (
    <div className="relative space-y-5">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <Loader2 className="animate-spin text-neutral-400" size={22} />
        </div>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-900">
        {copy.summary.title}
      </p>
      <div className="space-y-3">
        {summary.lineItems.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            {item.productImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.productImage}
                alt={item.productName}
                className="h-12 w-12 shrink-0 object-contain bg-neutral-50"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-neutral-50">
                <Package size={16} className="text-neutral-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-800">{item.productName}</p>
              <p className="text-xs text-neutral-400">
                {copy.summary.qty}: {item.quantity}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-neutral-900">
              {formatAmount(item.lineTotalAmount, item.currency, locale)}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-neutral-200 pt-4 text-sm">
        <div className="flex justify-between text-neutral-500">
          <span>{copy.summary.subtotal}</span>
          <span>{formatAmount(summary.subtotalAmount, summary.currency, locale)}</span>
        </div>
        {hasDeliveryBreakdown ? (
          <div className="flex justify-between text-neutral-500">
            <span>{copy.summary.delivery}</span>
            <span>{formatAmount(summary.deliveryAmount, summary.currency, locale)}</span>
          </div>
        ) : deliveryError ? (
          <div className="space-y-1">
            <div className="flex justify-between text-neutral-500">
              <span>{copy.summary.delivery}</span>
              <span className="text-red-500">{copy.summary.unavailable}</span>
            </div>
            <p className="text-xs text-red-600">{deliveryError}</p>
          </div>
        ) : isPaymentStep && (loading || !hasPricedDelivery) ? (
          <div className="flex justify-between text-neutral-500">
            <span>{copy.summary.delivery}</span>
            <span className="text-neutral-400">
              {loading ? copy.summary.calculatingDistance : copy.summary.waitingForAddress}
            </span>
          </div>
        ) : (
          <div className="flex justify-between text-neutral-500">
            <span>{copy.summary.delivery}</span>
            <span>
              {summary.deliveryAmount === 0
                ? copy.summary.calculatedAtPayment
                : formatAmount(summary.deliveryAmount, summary.currency, locale)}
            </span>
          </div>
        )}
        {summary.discountAmount > 0 ? (
          <div className="flex justify-between text-emerald-700">
            <span>{copy.summary.discount}</span>
            <span>-{formatAmount(summary.discountAmount, summary.currency, locale)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-bold text-neutral-900">
          <span>{copy.summary.total}</span>
          <span>{formatAmount(summary.grandTotalAmount, summary.currency, locale)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Success Screen ─────────────────────────────────────────────────── */

function SuccessScreen({
  copy,
  orderNumber,
  guestEmail,
}: {
  copy: CheckoutCopy;
  orderNumber: string;
  guestEmail: string;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const signupHref = `/auth/signup?redirect=${encodeURIComponent("/account")}${guestEmail ? `&email=${encodeURIComponent(guestEmail)}` : ""}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-success-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-white/95 p-4"
    >
      <div className="w-full max-w-md space-y-6 border border-neutral-200 bg-white px-6 py-10 text-center sm:px-10">
        <CheckCircle size={40} className="mx-auto text-emerald-600" strokeWidth={1.5} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            {copy.success.confirmation}
          </p>
          <h1 id="checkout-success-title" className="mt-2 text-2xl font-bold text-neutral-900">
            {copy.success.title}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">{copy.success.cardMessage}</p>
          {guestEmail ? (
            <p className="mt-2 text-sm text-neutral-500">{copy.success.emailSent(guestEmail)}</p>
          ) : null}
        </div>

        <div className="border-y border-neutral-200 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {copy.success.orderNumber}
          </p>
          <p className="mt-1 text-xl font-bold text-[#0F3460]">{orderNumber}</p>
        </div>

        <p className="text-xs text-neutral-400">{copy.success.keepOrderNumber}</p>

        {!isAuthenticated ? (
          <div className="space-y-3 border border-neutral-200 px-5 py-4 text-left">
            <p className="text-sm font-semibold text-neutral-900">{copy.success.trackOrder}</p>
            <p className="text-sm text-neutral-600">{copy.success.trackOrderHint}</p>
            <Link
              href={signupHref}
              className="inline-flex w-full items-center justify-center bg-[#0F3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
            >
              {copy.success.createAccount}
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
            >
              {copy.success.signIn}
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full bg-[#0F3460] py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
        >
          {copy.success.continueShopping}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Checkout Page ─────────────────────────────────────────────── */

export default function CheckoutPage() {
  const locale = useLocale();
  const copy = useCheckoutCopy();
  const validators = useMemo(() => createCheckoutValidators(copy), [copy]);
  const stepLabels = copy.stepLabels;
  const { cart, removeItem, refreshCartPrices } = useCart();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { currency } = useCurrency();

  const [step, setStep] = useState(0);
  const stepPanelRef = useRef<HTMLDivElement>(null);
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
  const addressRequired = deliveryMethod !== "PICKUP";

  const handleDeliveryMethodChange = useCallback((method: DeliveryMethod) => {
    setDeliveryMethod(method);
    if (method === "PICKUP") {
      setAddress({ addressLine1: "", city: "", country: "", postalCode: "" });
    }
  }, []);
  const cartItemsPayload = useMemo(
    () =>
      cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        ...(item.variantId ? { variantId: item.variantId } : {}),
      })),
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
    void refreshCartPrices();
  }, [refreshCartPrices]);

  useEffect(() => {
    if (cartItems.length === 0 && !successOrderNumber) {
      router.replace("/");
    }
  }, [cartItems.length, router, successOrderNumber]);

  const scrollToCheckoutStep = useCallback(() => {
    stepPanelRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
  }, []);

  useEffect(() => {
    scrollToCheckoutStep();
  }, [step, scrollToCheckoutStep]);

  useEffect(() => {
    if (step !== 2 || quoteLoading || !quote) return;

    scrollToCheckoutStep();
    const timeoutId = window.setTimeout(scrollToCheckoutStep, 150);
    return () => window.clearTimeout(timeoutId);
  }, [step, quoteLoading, quote?.paymentIntentId, scrollToCheckoutStep]);

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
          contact,
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
        error instanceof Error ? error.message : copy.errors.pricingFailed
      );
    } finally {
      setQuoteLoading(false);
    }
  }, [address, addressRequired, cartItems.length, cartItemsPayload, checkoutApiBase, contact, currency, deliveryMethod, isCustomerCheckout]);

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
          contact,
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
        error instanceof Error ? error.message : copy.errors.pricingFailed
      );
    } finally {
      setQuoteLoading(false);
    }
  }, [address, addressRequired, cartItems.length, cartItemsPayload, checkoutApiBase, contact, currency, deliveryMethod, isCustomerCheckout]);

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
      toast.error(copy.coupon.alreadyApplied);
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
          contact,
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
        const storeName =
          couponEligibleVendors.find((v) => v.vendorProfileId === vendorProfileId)?.storeName ??
          copy.common.vendor;
        const message = copy.coupon.notValidFor(code, storeName);
        setCouponFieldErrors((current) => ({ ...current, [vendorProfileId]: message }));
        toast.error(message);
        return;
      }

      setVendorCoupons(nextCoupons);
      setCouponInputs((current) => ({ ...current, [vendorProfileId]: "" }));
      setPriceSummary(summary);
      setQuote(data as QuoteSummary);
      toast.success(copy.coupon.applied(code));
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.coupon.applyFailed;
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
              variables: { colorPrimary: "#0F3460", borderRadius: "0px", fontFamily: "inherit" },
            },
          }
        : null,
    [quote?.clientSecret, locale]
  );

  const handleSuccess = useCallback(
    (orderNumber: string) => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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
        copy.common.vendor;
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
        copy={copy}
        orderNumber={successOrderNumber}
        guestEmail={successEmail}
      />
    );
  }

  if (awaitingCustomerPrefill) {
    return <PageLoader message={copy.loading} fullScreen />;
  }

  const stepIcons = [
    <MapPin key="s" size={16} />,
    <Truck key="d" size={16} />,
    <CreditCard key="p" size={16} />,
  ];
  const isRtl = locale !== "en";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <nav
          aria-label={copy.breadcrumb}
          className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-neutral-400"
        >
          <Link href="/" className="transition hover:text-[#0F3460] hover:underline">
            {copy.home}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <Link href="/cart" className="transition hover:text-[#0F3460] hover:underline">
            {copy.cart}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <span className="text-neutral-800">{copy.title}</span>
        </nav>

        <header className="mb-8 border-b border-neutral-200 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                {copy.title}
              </h1>
              <p className="mt-1.5 text-sm text-neutral-500">{copy.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F3460] hover:underline"
            >
              <ArrowLeft size={16} className={isRtl ? "rotate-180" : ""} />
              {copy.common.back}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] lg:gap-14">
          <div className="min-w-0 space-y-6">
            <div className="flex items-center gap-0">
              {stepLabels.map((label, idx) => (
                <div key={label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold ${
                        idx < step
                          ? "bg-emerald-600 text-white"
                          : idx === step
                            ? "bg-[#0F3460] text-white"
                            : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      {idx < step ? <CheckCircle size={16} /> : stepIcons[idx]}
                    </div>
                    <span
                      className={`hidden text-sm font-medium sm:block ${
                        idx === step ? "text-neutral-900" : "text-neutral-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < stepLabels.length - 1 ? (
                    <div
                      className={`mx-2 h-px flex-1 sm:mx-3 ${
                        idx < step ? "bg-emerald-500" : "bg-neutral-200"
                      }`}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-neutral-700 sm:hidden">
              {copy.stepOf(step + 1, stepLabels.length, stepLabels[step])}
            </p>

            <div
              ref={stepPanelRef}
              className="scroll-mt-28 border border-neutral-200 bg-white px-4 py-6 shadow-[0_20px_50px_-28px_rgba(15,52,96,0.28)] sm:px-7 sm:py-8 sm:scroll-mt-32"
            >
              <h2 className="mb-6 text-lg font-bold text-neutral-900">
                {stepLabels[step]}
                <span className="ms-2 text-sm font-normal text-neutral-400">
                  {copy.stepHeading(step + 1, stepLabels.length)}
                </span>
              </h2>

              {step === 0 && (
                <ShippingAddressStep
                  copy={copy}
                  validators={validators}
                  locale={locale}
                  contact={contact}
                  address={address}
                  addressRequired={addressRequired}
                  hasThirdPartyProducts={hasThirdPartyProducts}
                  deliveryMethod={deliveryMethod}
                  onDeliveryMethodChange={handleDeliveryMethodChange}
                  savedAddresses={savedAddresses}
                  onContactChange={(f) => setContact((prev) => ({ ...prev, ...f }))}
                  onAddressChange={(f) => setAddress((prev) => ({ ...prev, ...f }))}
                  onSelectSavedAddress={handleSelectSavedAddress}
                  onNext={() => setStep(1)}
                />
              )}

              {step === 1 && (
                <DeliveryCostStep
                  copy={copy}
                  locale={locale}
                  summary={priceSummary}
                  hasThirdPartyProducts={hasThirdPartyProducts}
                  deliveryMethod={deliveryMethod}
                  onDeliveryMethodChange={(method) => {
                    handleDeliveryMethodChange(method);
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
                  copy={copy}
                  locale={locale}
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
                  onPaymentElementReady={scrollToCheckoutStep}
                />
              )}
            </div>
          </div>

          <aside className="min-w-0 self-start lg:sticky lg:top-28">
            <div className="border-t border-neutral-900 bg-white pt-5">
              <OrderSummary
                copy={copy}
                locale={locale}
                summary={displaySummary}
                loading={(step === 1 || step === 2) && quoteLoading}
                deliveryError={step >= 1 ? quoteError : null}
                isPaymentStep={step >= 1}
                hasPricedDelivery={Boolean(priceSummary)}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
