"use client";

import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useCartCopy } from "@/lib/i18n/use-cart-copy";

export function CartEmptyState() {
  const copy = useCartCopy();

  return (
    <div className="border-y border-neutral-200 py-16 text-center sm:py-20">
      <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
        {copy.emptyTitle}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
        {copy.emptyDescription}
      </p>
      <Link
        href="/products"
        className="mt-8 inline-flex items-center justify-center gap-2 bg-[#0F3460] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
      >
        {copy.browseProducts}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
