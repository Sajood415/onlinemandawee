"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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

function chunkPairs<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
  return out;
}

function readFlexGapPx(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return parseFloat(cs.columnGap || cs.gap || "0") || 0;
}

function readViewportInnerPx(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  return Math.max(0, Math.floor(el.clientWidth - pl - pr));
}

function readRailPageWidthPx(el: HTMLElement) {
  const gap = readFlexGapPx(el);
  const inner = readViewportInnerPx(el);
  return Math.max(0, Math.floor(inner - gap));
}

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
    <div className="group flex h-full min-h-0 w-full min-w-0 flex-col rounded-sm bg-white transition-shadow duration-200 hover:shadow-md">
      <Link href={`/products/${p.id}`} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative aspect-4/5 min-h-0 min-w-0 overflow-hidden bg-white">
          <Image
            src={p.image}
            alt={p.name[locale]}
            fill
            className="object-cover object-center transition duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 38vw, 240px"
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-2 sm:pt-3">
          <h3 className="mb-1 line-clamp-2 min-h-9 text-start text-xs font-normal leading-snug tracking-tight text-neutral-800 sm:mb-2 sm:min-h-12 sm:text-sm md:text-base">
            {p.name[locale]}
          </h3>
          <p className="mb-2 text-start text-sm font-semibold text-black sm:mb-3 sm:text-base">{p.priceDisplay}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onAdd}
        disabled={busy}
        className="w-full rounded-md border border-black bg-white py-2 text-center text-[9px] font-bold uppercase tracking-[0.06em] text-black transition hover:bg-neutral-50 disabled:opacity-50 sm:py-2.5 sm:text-[11px]"
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
  const pages = chunkPairs(rows);
  const scrollRef = useRef<HTMLDivElement>(null);

  const syncRailPage = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const px = readRailPageWidthPx(el);
    if (px > 0) el.style.setProperty("--rail-page", `${px}px`);
  }, []);

  useLayoutEffect(() => {
    syncRailPage();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncRailPage);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncRailPage, rows.length]);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = readViewportInnerPx(el);
    if (step <= 0) return;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  const pageStyle: CSSProperties = {
    flex: "0 0 var(--rail-page)",
    width: "var(--rail-page)",
    minWidth: "var(--rail-page)",
  };

  return (
    <section className="mb-0 w-full min-w-0">
      {showTitle ? (
        <h2 className="mb-6 px-3 text-center text-lg font-bold uppercase tracking-wide text-slate-900 sm:mb-8 sm:px-0 sm:text-xl">
          {t("featuredTitle")}
        </h2>
      ) : null}
      <div className="relative flex min-h-0 w-full min-w-0 items-center gap-0 sm:gap-1.5">
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          className="absolute left-0 top-[42%] z-20 inline-flex h-7 w-7 -translate-y-1/2 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white/95 text-neutral-800 shadow-sm backdrop-blur-[2px] transition hover:bg-neutral-50 sm:static sm:top-auto sm:h-9 sm:w-9 sm:translate-y-0 sm:bg-white sm:shadow-md sm:backdrop-blur-none"
          aria-label="prev"
        >
          <ChevronLeft className="h-3.5 w-3.5 stroke-[1.75] sm:h-4 sm:w-4" />
        </button>

        <div className="mx-auto min-h-0 w-full min-w-0 max-w-[620px] flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            dir="ltr"
            className="flex min-h-0 w-full min-w-0 flex-row gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth px-4 [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x sm:gap-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
          >
            {pages.map((pair, pi) => (
              <div
                key={`${pair[0]?.id ?? pi}-${pair[1]?.id ?? "x"}`}
                className="box-border flex min-h-0 min-w-0 flex-row gap-3 sm:gap-4"
                style={pageStyle}
              >
                {pair.map((p) => (
                  <div key={p.id} className="min-h-0 min-w-0 flex-1">
                    <ProductCard p={p} locale={locale} />
                  </div>
                ))}
                {pair.length === 1 ? (
                  <div className="min-h-0 min-w-0 flex-1" aria-hidden />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="absolute right-0 top-[42%] z-20 inline-flex h-7 w-7 -translate-y-1/2 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white/95 text-neutral-800 shadow-sm backdrop-blur-[2px] transition hover:bg-neutral-50 sm:static sm:top-auto sm:h-9 sm:w-9 sm:translate-y-0 sm:bg-white sm:shadow-md sm:backdrop-blur-none"
          aria-label="next"
        >
          <ChevronRight className="h-3.5 w-3.5 stroke-[1.75] sm:h-4 sm:w-4" />
        </button>
      </div>
    </section>
  );
}
