"use client";

import Link from "next/link";
import { ArrowRight, Lock, Truck } from "lucide-react";

import {
  ESTIMATED_TAX_RATE,
  STANDARD_SHIPPING_FEE,
} from "@/components/cart/copy";
import { useCartCopy } from "@/lib/i18n/use-cart-copy";
import { useCurrency } from "@/store/currency-context";

export { ESTIMATED_TAX_RATE, STANDARD_SHIPPING_FEE };

type CartOrderSummaryProps = {
  subtotal: number;
  itemCount: number;
  shippingFee: number;
  taxAmount: number;
  total: number;
};

export function CartOrderSummary({
  subtotal,
  itemCount,
  shippingFee,
  taxAmount,
  total,
}: CartOrderSummaryProps) {
  const copy = useCartCopy();
  const { currency, formatPrice } = useCurrency();
  const fmt = (amount: number) => formatPrice(amount, currency);

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_16px_50px_rgba(15,52,96,0.08)]">
        <div className="border-b border-neutral-100 bg-gradient-to-r from-[#0f3460]/5 to-transparent px-5 py-4">
          <h2 className="text-lg font-bold tracking-tight text-[#0f3460]">
            {copy.orderSummary}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            {itemCount} {itemCount === 1 ? copy.item : copy.items}
          </p>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm">
          <div className="flex items-center justify-between text-neutral-600">
            <span>{copy.subtotal}</span>
            <span className="font-semibold text-neutral-900">{fmt(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>{copy.shipping}</span>
            <span className="font-semibold text-neutral-900">
              {shippingFee <= 0 ? copy.shippingFree : fmt(shippingFee)}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>{copy.tax}</span>
            <span className="font-semibold text-neutral-900">{fmt(taxAmount)}</span>
          </div>
        </div>

        <div className="border-t border-neutral-100 px-5 py-4">
          <div className="flex items-end justify-between">
            <span className="text-sm font-semibold text-neutral-700">{copy.total}</span>
            <span className="text-2xl font-bold tracking-tight text-[#0f3460]">
              {fmt(total)}
            </span>
          </div>
        </div>

        <div className="border-t border-neutral-100 px-5 py-4">
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0f3460]/10 text-[#0f3460]">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{copy.deliveryEstimate}</p>
                <p className="mt-0.5 text-sm text-neutral-600">{copy.deliveryWindow}</p>
                <p className="mt-1 text-xs text-neutral-500">{copy.deliveryNote}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-100 px-5 py-5">
          <Link
            href="/checkout"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(220,53,69,0.28)] transition hover:bg-primary/90"
          >
            {copy.checkout}
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700">
            <Lock className="h-3.5 w-3.5 text-[#0f3460]" />
            {copy.secureCheckout}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function calculateCartTotals(subtotal: number) {
  const shippingFee = STANDARD_SHIPPING_FEE;
  const taxAmount = subtotal * ESTIMATED_TAX_RATE;
  const total = subtotal + shippingFee + taxAmount;

  return { shippingFee, taxAmount, total };
}
