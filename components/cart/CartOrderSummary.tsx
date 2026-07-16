"use client";

import { ArrowRight, Lock } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useCartCopy } from "@/lib/i18n/use-cart-copy";
import { useCurrency } from "@/store/currency-context";

type CartOrderSummaryProps = {
  subtotal: number;
  itemCount: number;
};

export function CartOrderSummary({ subtotal, itemCount }: CartOrderSummaryProps) {
  const copy = useCartCopy();
  const { currency, formatPrice } = useCurrency();
  const fmt = (amount: number) => formatPrice(amount, currency);

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="border-t border-neutral-900 pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-900">
          {copy.orderSummary}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {itemCount} {itemCount === 1 ? copy.item : copy.items}
        </p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-neutral-500">{copy.subtotal}</dt>
            <dd className="font-medium tabular-nums text-neutral-900">{fmt(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-neutral-500">{copy.shipping}</dt>
            <dd className="text-neutral-500">{copy.shippingCalculated}</dd>
          </div>
        </dl>

        <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-neutral-200 pt-5">
          <span className="text-sm font-semibold text-neutral-900">{copy.total}</span>
          <span className="text-xl font-bold tabular-nums tracking-tight text-neutral-900">
            {fmt(subtotal)}
          </span>
        </div>

        <p className="mt-2 text-xs text-neutral-400">
          {copy.deliveryWindow}
        </p>

        <Link
          href="/checkout"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#0F3460] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
        >
          {copy.checkout}
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Lock className="h-3 w-3" />
          {copy.secureCheckout}
        </p>
      </div>
    </aside>
  );
}
