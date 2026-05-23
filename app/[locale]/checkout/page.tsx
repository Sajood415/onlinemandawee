"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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
  Truck,
  User,
} from "lucide-react";

import { useCart } from "@/store/cart-context";
import { toast } from "@/lib/utils/toast";

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
  grandTotalAmount: number;
  currency: string;
  lineItems: LineItem[];
};

type PriceSummary = {
  subtotalAmount: number;
  deliveryAmount: number;
  grandTotalAmount: number;
  currency: string;
  lineItems: LineItem[];
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
  onBack,
  onSuccess,
}: {
  summary: PriceSummary;
  contact: ContactForm;
  address: AddressForm;
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
          subtotalAmount: summary.subtotalAmount,
          deliveryAmount: summary.deliveryAmount,
          grandTotalAmount: summary.grandTotalAmount,
          lineItems: summary.lineItems,
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
  onBack,
  onSuccess,
}: {
  quote: QuoteSummary;
  contact: ContactForm;
  address: AddressForm;
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
            subtotalAmount: quote.subtotalAmount,
            deliveryAmount: quote.deliveryAmount,
            grandTotalAmount: quote.grandTotalAmount,
            lineItems: quote.lineItems,
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
  const locale = useLocale();
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/orders/guest/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, guestEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data?.error?.message ?? "Could not cancel order.");
        return;
      }
      setCancelled(true);
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-6">
        {cancelled ? (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={40} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Cancelled</h1>
              <p className="text-gray-500 mt-2 text-sm">
                Your order <strong>{orderNumber}</strong> has been cancelled. A confirmation email has been sent.
              </p>
            </div>
            <button onClick={() => router.push(`/${locale}`)}
              className="w-full rounded-xl bg-[#0f3460] text-white font-semibold py-3.5 hover:bg-[#0a2540] transition-colors">
              Continue Shopping
            </button>
          </>
        ) : (
          <>
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

            {cancelError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2">{cancelError}</p>
            )}

            <button onClick={() => router.push(`/${locale}`)}
              className="w-full rounded-xl bg-[#0f3460] text-white font-semibold py-3.5 hover:bg-[#0a2540] transition-colors">
              Continue Shopping
            </button>

            {/* Cancel — only possible before vendor accepts */}
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full rounded-xl border border-red-200 text-red-500 text-sm font-medium py-3 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel this order"}
            </button>
            <p className="text-xs text-gray-400 -mt-3">
              You can cancel only while the vendor hasn&apos;t accepted yet.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main Checkout Page ─────────────────────────────────────────────── */

export default function CheckoutPage() {
  const { cart, removeItem } = useCart();
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [contact, setContact] = useState<ContactForm>({ guestName: "", guestEmail: "", guestPhone: "" });
  const [address, setAddress] = useState<AddressForm>({ addressLine1: "", city: "", country: "", postalCode: "" });

  // Stripe quote (only needed when card payment is selected)
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Simple price summary (derived from cart, no Stripe needed for COD)
  const [priceSummary, setPriceSummary] = useState<PriceSummary | null>(null);

  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string>("");
  const stripeAvailable = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  const cartItems = cart.items;

  useEffect(() => {
    if (cartItems.length === 0 && !successOrderNumber) {
      router.replace(`/${locale}`);
    }
  }, [cartItems.length, router, locale, successOrderNumber]);

  // Fetch a Stripe payment intent when card method is selected and we reach step 2
  const fetchStripeQuote = useCallback(async () => {
    if (cartItems.length === 0) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/checkout/guest/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          currency: "USD",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuoteError(data?.error?.message ?? "Could not load pricing. Please try again.");
        return;
      }
      setQuote(data.data);
      setPriceSummary({
        subtotalAmount: data.data.subtotalAmount,
        deliveryAmount: data.data.deliveryAmount,
        grandTotalAmount: data.data.grandTotalAmount,
        currency: data.data.currency,
        lineItems: data.data.lineItems,
      });
    } catch {
      setQuoteError("Network error. Please try again.");
    } finally {
      setQuoteLoading(false);
    }
  }, [cartItems]);

  // Fetch COD pricing — no Stripe involved, just DB lookup
  const fetchCodPricing = useCallback(async () => {
    if (cartItems.length === 0) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/checkout/guest/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          currency: "USD",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuoteError(data?.error?.message ?? "Could not load pricing. Please try again.");
        return;
      }
      setPriceSummary({
        subtotalAmount: data.data.subtotalAmount,
        deliveryAmount: data.data.deliveryAmount,
        grandTotalAmount: data.data.grandTotalAmount,
        currency: data.data.currency,
        lineItems: data.data.lineItems,
      });
    } catch {
      setQuoteError("Network error. Please try again.");
    } finally {
      setQuoteLoading(false);
    }
  }, [cartItems]);

  // When reaching step 2 (or switching method on step 2), load the right pricing
  useEffect(() => {
    if (step !== 2) return;
    if (paymentMethod === "cod") {
      void fetchCodPricing();
    } else if (paymentMethod === "card" && stripeAvailable) {
      void fetchStripeQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paymentMethod]);

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
    if (m === "card") {
      setQuote(null);
      setPriceSummary(null);
    } else {
      setPriceSummary(null);
    }
  };

  if (successOrderNumber) {
    return (
      <SuccessScreen
        orderNumber={successOrderNumber}
        paymentMethod={paymentMethod}
        guestEmail={successEmail}
      />
    );
  }

  const stepIcons = [<User key="u" size={18} />, <MapPin key="m" size={18} />, <CreditCard key="c" size={18} />];
  const displaySummary = priceSummary ?? (quote ? {
    subtotalAmount: quote.subtotalAmount,
    deliveryAmount: quote.deliveryAmount,
    grandTotalAmount: quote.grandTotalAmount,
    currency: quote.currency,
    lineItems: quote.lineItems,
  } : null);

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
                      onClick={() => paymentMethod === "card" ? fetchStripeQuote() : fetchCodPricing()}
                      className="text-sm text-[#0f3460] underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!quoteLoading && !quoteError && paymentMethod === "cod" && priceSummary && (
                  <CodForm
                    summary={priceSummary}
                    contact={contact}
                    address={address}
                    onBack={() => setStep(1)}
                    onSuccess={handleSuccess}
                  />
                )}

                {!quoteLoading && !quoteError && paymentMethod === "card" && quote && stripeOptions && stripePromise && (
                  <Elements stripe={stripePromise} options={stripeOptions}>
                    <StripePayForm
                      quote={quote}
                      contact={contact}
                      address={address}
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
