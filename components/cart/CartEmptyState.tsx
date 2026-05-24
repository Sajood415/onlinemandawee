import { ArrowRight, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";

import { getCartCopy } from "@/components/cart/copy";

export function CartEmptyState() {
  const copy = getCartCopy();

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-[0_16px_50px_rgba(15,52,96,0.08)]">
      <div className="relative bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] px-6 py-10 text-center text-white sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
          <ShoppingBag className="h-9 w-9" />
        </div>
        <h2 className="relative text-2xl font-bold tracking-tight sm:text-3xl">
          {copy.emptyTitle}
        </h2>
        <p className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
          {copy.emptyDescription}
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 px-6 py-8 sm:flex-row sm:justify-center">
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-primary/90"
        >
          {copy.browseProducts}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-[#0f3460] transition hover:bg-neutral-50"
        >
          {copy.continueShopping}
        </Link>
      </div>
      <div className="border-t border-neutral-100 px-6 py-4 text-center text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Premium picks from trusted local vendors
        </span>
      </div>
    </div>
  );
}
