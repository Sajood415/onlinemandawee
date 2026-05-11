"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import productCatalog from "@/data/product.json";
import { useCart } from "@/store/cart-context";
import { toast } from "@/lib/utils/toast";

type LocaleKey = "en" | "ps" | "fa-AF";

type Row = {
  id: string;
  price: number;
  priceDisplay: string;
  image: string;
  name: Record<LocaleKey, string>;
};

function ProductCard({ p, locale }: { p: Row; locale: LocaleKey }) {
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const t = useTranslations("Homepage.store");

  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await addItem(p.id, 1);
      toast.success(t("addedToCart"));
    } catch {
      toast.error(t("addError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <Link href={`/products/${p.id}`} className="flex min-h-0 flex-1 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2">
        <div className="relative aspect-square w-full min-w-0 overflow-hidden rounded-md bg-neutral-50">
          <Image
            src={p.image}
            alt={p.name[locale]}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 45vw, 210px"
          />
        </div>
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          <h3 className="line-clamp-2 text-[13px] font-normal leading-snug text-black sm:text-sm">
            {p.name[locale]}
          </h3>
          <p className="mt-2 text-sm font-semibold tracking-tight text-black">{p.priceDisplay}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onAdd}
        disabled={busy}
        className="mt-3 w-full rounded-sm border border-neutral-900 bg-white py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-900 transition-colors hover:bg-neutral-50 disabled:opacity-45 sm:text-[11px]"
      >
        {busy ? "…" : t("addToCart")}
      </button>
    </div>
  );
}

type Props = {
  productIds?: string[];
  showTitle?: boolean;
};

export function HomeProductRail({ productIds, showTitle = true }: Props) {
  const locale = useLocale() as LocaleKey;
  const t = useTranslations("Homepage.store");
  const all = productCatalog.featuredProducts as Row[];
  const rows = productIds?.length
    ? (productIds
        .map((id) => all.find((p) => p.id === id))
        .filter((p): p is Row => Boolean(p)) as Row[])
    : all;

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    el.scrollBy({ left: dir * Math.max(1, Math.round(w)), behavior: "smooth" });
  }, []);

  return (
    <section className="mb-0 w-full min-w-0">
      {showTitle ? (
        <h2 className="mb-5 text-center text-lg font-bold uppercase tracking-wide text-slate-900 sm:mb-7 sm:text-xl">
          {t("featuredTitle")}
        </h2>
      ) : null}

      <div className="relative w-full min-w-0">
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          className="absolute left-0 top-[92px] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-50 active:scale-95 sm:top-[100px] md:h-10 md:w-10 md:top-[108px]"
          aria-label="prev"
        >
          <ChevronLeft className="h-4 w-4 stroke-[1.6] md:h-[18px] md:w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="absolute right-0 top-[92px] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-50 active:scale-95 sm:top-[100px] md:h-10 md:w-10 md:top-[108px]"
          aria-label="next"
        >
          <ChevronRight className="h-4 w-4 stroke-[1.6] md:h-[18px] md:w-[18px]" />
        </button>

        <div
          ref={scrollRef}
          dir="ltr"
          className="flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth px-10 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x sm:px-11 md:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {rows.map((p) => (
            <div
              key={p.id}
              className="box-border min-w-0 max-w-[210px] shrink-0 snap-start basis-[calc((100%-0.75rem)/2)]"
            >
              <div className="h-full px-[5px] sm:px-2 md:px-[15px]">
                <ProductCard p={p} locale={locale} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
