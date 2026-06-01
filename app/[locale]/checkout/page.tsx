"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  ShoppingBag,
  Tag,
  Truck,
  User,
  X,
} from "lucide-react";

import { PageLoader } from "@/components/ui/PageLoader";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/store/auth-context";
import { useCart } from "@/store/cart-context";

/* ─── Stripe setup ───────────────────────────────────────────────────── */

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

/* ─── Types ──────────────────────────────────────────────────────────── */

type PaymentMethod = "card" | "cod";

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

type PriceSummary = {
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  currency: string;
  lineItems: LineItem[];
  appliedCoupons: AppliedCouponSummary[];
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

const STEP_LABELS = ["Contact", "Address", "Payment"];

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
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 transition placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
      />
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

/* ─── Step 1: Contact Info ───────────────────────────────────────────── */

function ContactStep({
  form,
  onChange,
  onNext,
}: {
  form: ContactForm;
  onChange: (f: Partial<ContactForm>) => void;
  onNext: () => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName.trim() || !form.guestEmail.trim() || !form.guestPhone.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guestEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <InputField
        label="Full Name" required type="text" placeholder="John Doe"
        value={form.guestName} onChange={(e) => onChange({ guestName: e.target.value })}
        autoFocus
      />
      <InputField
        label="Email Address" required type="email" placeholder="you@example.com"
        value={form.guestEmail} onChange={(e) => onChange({ guestEmail: e.target.value })}
      />
      <InputField
        label="Phone Number" required type="tel" placeholder="+93 70 000 0000"
        value={form.guestPhone} onChange={(e) => onChange({ guestPhone: e.target.value })}
      />
      <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f3460] text-white font-semibold py-3.5 hover:bg-[#0a2540] transition-colors">
        Continue to Address <ArrowRight size={17} />
      </button>
    </form>
  );
}

/* ─── Step 2: Delivery Address ───────────────────────────────────────── */

function AddressStep({
  form, onChange, onNext, onBack,
}: {
  form: AddressForm;
  onChange: (f: Partial<AddressForm>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.addressLine1.trim() || !form.city.trim() || !form.country.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <InputField
        label="Street Address" required type="text" placeholder="123 Main Street, Apt 4"
        value={form.addressLine1} onChange={(e) => onChange({ addressLine1: e.target.value })}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="City" required type="text" placeholder="Kabul"
          value={form.city} onChange={(e) => onChange({ city: e.target.value })}
        />
        <InputField
          label="Postal Code" type="text" placeholder="1001"
          value={form.postalCode} onChange={(e) => onChange({ postalCode: e.target.value })}
        />
      </div>
      <InputField
        label="Country" required type="text" placeholder="Afghanistan"
        value={form.country} onChange={(e) => onChange({ country: e.target.value })}
      />
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-600 font-semibold py-3.5 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={17} /> Back
        </button>
        <button type="submit"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0f3460] text-white font-semibold py-3.5 hover:bg-[#0a2540] transition-colors">
          Continue to Payment <ArrowRight size={17} />
        </button>
      </div>
    </form>
  );
}

/* ─── Payment method selector ────────────────────────────────────────── */

function PaymentMethodSelector({
  selected,
  onSelect,
  stripeAvailable,
}: {
  selected: PaymentMethod;
  onSelect: (m: PaymentMethod) => void;
  stripeAvailable: boolean;
}) {
  const options: Array<{
    id: PaymentMethod;
    label: string;
    sub: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }> = [
    {
      id: "cod",
      label: "Cash on Delivery",
      sub: "Pay in cash when your order arrives",
      icon: <Banknote size={22} className="text-green-600" />,
    },
    {
      id: "card",
      label: "Credit / Debit Card",
      sub: stripeAvailable ? "Visa, Mastercard, Amex — secured by Stripe" : "Stripe not configured — add keys to .env.local",
      icon: <CreditCard size={22} className="text-blue-600" />,
      disabled: !stripeAvailable,
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={opt.disabled}
          onClick={() => !opt.disabled && onSelect(opt.id)}
          className={`w-full flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all ${
            opt.disabled
              ? "opacity-40 cursor-not-allowed border-gray-100 bg-gray-50"
              : selected === opt.id
              ? "border-[#0f3460] bg-[#0f3460]/5"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            opt.disabled ? "bg-gray-100" : selected === opt.id ? "bg-white shadow-sm" : "bg-gray-50"
          }`}>
            {opt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
            selected === opt.id ? "border-[#0f3460] bg-[#0f3460]" : "border-gray-300"
          }`}>
            {selected === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── COD confirm form ───────────────────────────────────────────────── */

function CodForm({
  summary,
  contact,
  address,
  cartItems,
  vendorCoupons,
  onBack,
  onSuccess,
}: {
  summary: PriceSummary;
  contact: ContactForm;
  address: AddressForm;
  cartItems: Array<{ productId: string; quantity: number }>;
  vendorCoupons: VendorCouponEntry[];
  onBack: () => void;
  onSuccess: (orderNumber: string) => void;
}) {
  const [placing, setPlacing] = useState(false);

  const handlePlace = async () => {
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout/guest/confirm-cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: contact.guestName,
          guestEmail: contact.guestEmail,
          guestPhone: contact.guestPhone,
          addressLine1: address.addressLine1,
          city: address.city,
          country: address.country,
          postalCode: address.postalCode,
          currency: summary.currency,
          items: cartItems,
          vendorCoupons,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message ?? "Could not place order. Please try again.");
        return;
      }
      onSuccess(data.data.orderNumber);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-green-50 border border-green-100 p-4 flex gap-3">
        <Truck size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-800">
          <p className="font-semibold">Cash on Delivery</p>
          <p className="mt-0.5 text-green-700">
            Your order will be placed and you pay <span className="font-bold">{formatAmount(summary.grandTotalAmount, summary.currency)}</span> in cash when it arrives.
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} disabled={placing}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-600 font-semibold py-3.5 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <ArrowLeft size={17} /> Back
        </button>
        <button type="button" onClick={handlePlace} disabled={placing}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white font-semibold py-3.5 hover:bg-green-700 transition-colors disabled:opacity-60">
          {placing ? <><Loader2 size={17} className="animate-spin" /> Placing…</> : <><CheckCircle size={17} /> Place Order</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Card / Stripe payment form ─────────────────────────────────────── */

function StripePayForm({
  quote,
  contact,
  address,
  cartItems,
  vendorCoupons,
  onBack,
  onSuccess,
}: {
  quote: QuoteSummary;
  contact: ContactForm;
  address: AddressForm;
  cartItems: Array<{ productId: string; quantity: number }>;
  vendorCoupons: VendorCouponEntry[];
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
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/checkout/complete",
          payment_method_data: {
            billing_details: {
              name: contact.guestName,
              email: contact.guestEmail,
              phone: contact.guestPhone,
              address: {
                line1: address.addressLine1,
                city: address.city,
                country: address.country,
                postal_code: address.postalCode || undefined,
              },
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
        const res = await fetch("/api/checkout/guest/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            guestName: contact.guestName,
            guestEmail: contact.guestEmail,
            guestPhone: contact.guestPhone,
            addressLine1: address.addressLine1,
            city: address.city,
            country: address.country,
            postalCode: address.postalCode,
            currency: quote.currency,
            items: cartItems,
            vendorCoupons,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error?.message ?? "Order could not be recorded. Please contact support.");
          return;
        }
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
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} disabled={paying}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-600 font-semibold py-3.5 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <ArrowLeft size={17} /> Back
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

function OrderSummary({ summary, loading }: { summary: PriceSummary | null; loading: boolean }) {
  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[120px]">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="flex justify-between text-gray-500">
          <span>Delivery</span>
          <span>{summary.deliveryAmount === 0 ? "Free" : formatAmount(summary.deliveryAmount, summary.currency)}</span>
        </div>
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
  paymentMethod,
  guestEmail,
}: {
  orderNumber: string;
  paymentMethod: PaymentMethod;
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
          <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
          <p className="text-gray-500 mt-2 text-sm">
            {paymentMethod === "cod"
              ? "Your order is confirmed. Please have cash ready when your delivery arrives."
              : "Your payment was successful and the vendor has been notified."}
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

        {paymentMethod === "cod" && (
          <div className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700">
            <Banknote size={18} className="flex-shrink-0" />
            <span>Payment: Cash on Delivery</span>
          </div>
        )}

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
  const { cart, removeItem } = useCart();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [contact, setContact] = useState<ContactForm>({ guestName: "", guestEmail: "", guestPhone: "" });
  const [address, setAddress] = useState<AddressForm>({ addressLine1: "", city: "", country: "", postalCode: "" });
  const [customerPrefillReady, setCustomerPrefillReady] = useState(false);

  // Stripe quote (only needed when card payment is selected)
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Simple price summary (derived from cart, no Stripe needed for COD)
  const [priceSummary, setPriceSummary] = useState<PriceSummary | null>(null);

  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string>("");
  const [couponInputs, setCouponInputs] = useState<Record<string, string>>({});
  const [vendorCoupons, setVendorCoupons] = useState<VendorCouponEntry[]>([]);
  const [couponFieldErrors, setCouponFieldErrors] = useState<Record<string, string>>({});
  const [checkoutOffers, setCheckoutOffers] = useState<CheckoutVendorOffer[]>([]);
  const [applyingCouponVendorId, setApplyingCouponVendorId] = useState<string | null>(null);
  const stripeAvailable = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  const cartItems = cart.items;
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
  });

  useEffect(() => {
    if (cartItems.length === 0 && !successOrderNumber) {
      router.replace("/");
    }
  }, [cartItems.length, router, successOrderNumber]);

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
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/checkout/guest/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItemsPayload,
          currency: "USD",
          vendorCoupons: coupons,
        }),
      });
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
  }, [cartItems.length, cartItemsPayload]);

  const fetchCodPricing = useCallback(async (coupons: VendorCouponEntry[]) => {
    if (cartItems.length === 0) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/checkout/guest/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItemsPayload,
          currency: "USD",
          vendorCoupons: coupons,
        }),
      });
      const data = await parseApiResponse<PriceSummary>(res);
      setPriceSummary(mapQuoteToSummary(data));
    } catch (error) {
      setQuoteError(
        error instanceof Error ? error.message : "Could not load pricing. Please try again."
      );
    } finally {
      setQuoteLoading(false);
    }
  }, [cartItems.length, cartItemsPayload]);

  const refreshPricing = useCallback(
    async (coupons: VendorCouponEntry[]) => {
      if (paymentMethod === "cod") {
        await fetchCodPricing(coupons);
      } else if (paymentMethod === "card" && stripeAvailable) {
        await fetchStripeQuote(coupons);
      }
    },
    [paymentMethod, stripeAvailable, fetchCodPricing, fetchStripeQuote]
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
      const endpoint =
        paymentMethod === "card" && stripeAvailable
          ? "/api/checkout/guest/intent"
          : "/api/checkout/guest/pricing";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItemsPayload,
          currency: "USD",
          vendorCoupons: nextCoupons,
        }),
      });
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
      if (paymentMethod === "card" && stripeAvailable) {
        setQuote(data as QuoteSummary);
      }
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
            appearance: {
              theme: "stripe" as const,
              variables: { colorPrimary: "#0f3460", borderRadius: "12px", fontFamily: "inherit" },
            },
          }
        : null,
    [quote?.clientSecret]
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

  // Clear any stale error and re-fetch when switching payment methods
  const handleMethodChange = (m: PaymentMethod) => {
    setPaymentMethod(m);
    setQuoteError(null);
    setQuote(null);
    setPriceSummary(null);
  };

  const displaySummary = priceSummary ?? (quote ? mapQuoteToSummary(quote) : null);

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
    if (step !== 2) return;
    void refreshPricing(vendorCoupons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paymentMethod]);

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
        paymentMethod={paymentMethod}
        guestEmail={successEmail}
      />
    );
  }

  if (awaitingCustomerPrefill) {
    return <PageLoader message="Loading checkout..." fullScreen />;
  }

  const stepIcons = [<User key="u" size={18} />, <MapPin key="m" size={18} />, <CreditCard key="c" size={18} />];

  return (
    <div className="min-h-screen bg-gray-50">
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
            <h2 className="text-lg font-bold text-[#0f3460] mb-6">{STEP_LABELS[step]}</h2>

            {step === 0 && (
              <ContactStep
                form={contact}
                onChange={(f) => setContact((prev) => ({ ...prev, ...f }))}
                onNext={() => setStep(1)}
              />
            )}

            {step === 1 && (
              <AddressStep
                form={address}
                onChange={(f) => setAddress((prev) => ({ ...prev, ...f }))}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}

            {step === 2 && (
              <div className="space-y-6">
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
                          onCouponInputChange={(value) => {
                            setCouponInputs((current) => ({
                              ...current,
                              [vendor.vendorProfileId]: value,
                            }));
                            setCouponFieldErrors((current) => ({
                              ...current,
                              [vendor.vendorProfileId]: "",
                            }));
                          }}
                          availableOffers={vendorOffers?.coupons ?? []}
                          fieldError={couponFieldErrors[vendor.vendorProfileId]}
                          appliedCoupons={(displaySummary?.appliedCoupons ?? []).filter(
                            (coupon) => coupon.vendorProfileId === vendor.vendorProfileId
                          )}
                          onApply={() => void handleApplyCoupon(vendor.vendorProfileId)}
                          onRemove={(code) =>
                            void handleRemoveCoupon(code, vendor.vendorProfileId)
                          }
                          applying={applyingCouponVendorId === vendor.vendorProfileId}
                        />
                      );
                    })}
                  </div>
                ) : null}

                {couponEligibleVendors.length > 0 ? <div className="h-px bg-gray-100" /> : null}

                {/* Payment method picker */}
                <PaymentMethodSelector
                  selected={paymentMethod}
                  onSelect={handleMethodChange}
                  stripeAvailable={stripeAvailable}
                />

                <div className="h-px bg-gray-100" />

                {/* Payment action area */}
                {quoteLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-gray-400" size={28} />
                  </div>
                )}

                {quoteError && !quoteLoading && (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-red-500">{quoteError}</p>
                    <button
                      onClick={() => void refreshPricing(vendorCoupons)}
                      className="text-sm text-[#0f3460] underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {hasUnappliedCouponInput && !quoteLoading ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Apply your discount code or clear the field before placing your order.
                  </div>
                ) : null}

                {canPlaceOrder && paymentMethod === "cod" && priceSummary && (
                  <CodForm
                    summary={priceSummary}
                    contact={contact}
                    address={address}
                    cartItems={cartItemsPayload}
                    vendorCoupons={vendorCoupons}
                    onBack={() => setStep(1)}
                    onSuccess={handleSuccess}
                  />
                )}

                {canPlaceOrder && paymentMethod === "card" && quote && stripeOptions && stripePromise && (
                  <Elements stripe={stripePromise} options={stripeOptions}>
                    <StripePayForm
                      quote={quote}
                      contact={contact}
                      address={address}
                      cartItems={cartItemsPayload}
                      vendorCoupons={vendorCoupons}
                      onBack={() => setStep(1)}
                      onSuccess={handleSuccess}
                    />
                  </Elements>
                )}
              </div>
            )}
          </div>

          {/* Test card hint — only show when card is selected */}
          {step === 2 && paymentMethod === "card" && stripeAvailable && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Test mode — use test cards only</p>
              <p>Card number: <span className="font-mono font-bold">4242 4242 4242 4242</span></p>
              <p>Expiry: any future date · CVC: any 3 digits · ZIP: any 5 digits</p>
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <div className="lg:sticky lg:top-8 self-start">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <OrderSummary summary={displaySummary} loading={step === 2 && quoteLoading} />
            {step < 2 && cartItems.length > 0 && (
              <div className="space-y-4 mt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Cart</p>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
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
                      ${(item.productPrice * item.quantity / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
