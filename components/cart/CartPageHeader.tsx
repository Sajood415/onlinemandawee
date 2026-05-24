import Link from "next/link";
import { ChevronRight, ShoppingBag } from "lucide-react";

import { getCartCopy } from "@/components/cart/copy";

type CartPageHeaderProps = {
  itemCount: number;
  isRtl?: boolean;
};

export function CartPageHeader({ itemCount, isRtl = false }: CartPageHeaderProps) {
  const copy = getCartCopy();

  return (
    <section className="relative overflow-hidden border-b border-[#0f3460]/10 bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_45%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-2 text-sm text-white/70"
        >
          <Link href="/" className="transition hover:text-white hover:underline">
            Home
          </Link>
          <ChevronRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
          <span className="font-medium text-white">{copy.title}</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <ShoppingBag className="h-3.5 w-3.5" />
              Shopping cart
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
              {copy.subtitle}
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-white/70">Items in cart</p>
            <p className="text-2xl font-bold">{itemCount}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
