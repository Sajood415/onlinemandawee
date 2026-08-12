"use client";

import { Loader2, MapPin, Search, Store, Tags, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { useRouter } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import {
  fetchMarketplaceSuggest,
  type MarketplaceSuggestResult,
} from "@/lib/search/public-marketplace-suggest";
import { useCurrency } from "@/store/currency-context";

type HeaderSearchSuggestProps = {
  query: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (value: string) => void;
  onSubmitSearch: () => void;
  placeholder: string;
  searchButtonLabel: string;
  isRtl: boolean;
  variant: "desktop" | "mobile";
};

const EMPTY: MarketplaceSuggestResult = {
  query: "",
  products: [],
  productTotal: 0,
  vendors: [],
  industries: [],
  places: [],
};

function isFormVisible(el: HTMLElement | null) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function HeaderSearchSuggest({
  query,
  open,
  onOpenChange,
  onQueryChange,
  onSubmitSearch,
  placeholder,
  searchButtonLabel,
  isRtl,
  variant,
}: HeaderSearchSuggestProps) {
  const t = useTranslations("SearchPages.suggest");
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketplaceSuggestResult>(EMPTY);
  const [panelBox, setPanelBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;
    if (!open || debouncedQuery.length < 2 || !formVisible) {
      setResult(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchMarketplaceSuggest(debouncedQuery, locale)
      .then((data) => {
        if (alive) setResult(data);
      })
      .catch(() => {
        if (alive) setResult(EMPTY);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [debouncedQuery, formVisible, locale, open]);

  const showPanel =
    open && formVisible && query.trim().length >= 2 && panelBox != null;

  const syncLayout = () => {
    const el = rootRef.current;
    const visible = isFormVisible(el);
    setFormVisible(visible);
    if (!visible || !el) {
      setPanelBox(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPanelBox({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    syncLayout();
    window.addEventListener("resize", syncLayout);
    window.addEventListener("scroll", syncLayout, true);
    return () => {
      window.removeEventListener("resize", syncLayout);
      window.removeEventListener("scroll", syncLayout, true);
    };
  }, [open, query, variant]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onOpenChange]);

  const hasGroups = useMemo(() => {
    return (
      result.products.length > 0 ||
      result.vendors.length > 0 ||
      result.industries.length > 0 ||
      result.places.length > 0
    );
  }, [result]);

  const navigateTo = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const clearQuery = () => {
    onQueryChange("");
    onOpenChange(false);
    rootRef.current?.querySelector("input")?.focus();
  };

  const formClass =
    variant === "desktop"
      ? `group relative z-[10040] hidden h-11 min-w-0 max-w-3xl flex-1 items-center rounded-full border border-white/25 bg-white shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-white/40 md:flex ${
          isRtl ? "flex-row-reverse pr-1.5 pl-3" : "pl-1.5 pr-3"
        }`
      : `relative z-[10040] mt-2 flex h-10 items-center rounded-full border border-white/20 bg-white px-1.5 md:hidden ${
          isRtl ? "flex-row-reverse" : ""
        }`;

  const itemClass =
    "flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-start transition hover:bg-neutral-50";

  const panel =
    mounted && showPanel ? (
      <div
        ref={panelRef}
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          top: panelBox.top,
          left: panelBox.left,
          width: panelBox.width,
          zIndex: 10060,
        }}
        className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_18px_40px_rgba(15,52,96,0.18)] ${
          variant === "mobile" ? "max-h-[70dvh]" : "max-h-[min(28rem,70dvh)]"
        }`}
      >
        <div className="max-h-[inherit] overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : !hasGroups ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              {t("noMatches")}
            </div>
          ) : (
            <>
              {result.products.length > 0 ? (
                <SuggestGroup title={t("products")}>
                  {result.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      role="option"
                      className={itemClass}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        navigateTo(product.href);
                      }}
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        {product.image ? (
                          <CatalogImage
                            src={product.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-medium text-neutral-900">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-[#0F3460]">
                          {formatPrice(
                            product.priceAmount / 100,
                            product.currency
                          )}
                        </span>
                      </span>
                    </button>
                  ))}
                </SuggestGroup>
              ) : null}

              {result.vendors.length > 0 ? (
                <SuggestGroup title={t("vendors")}>
                  {result.vendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      type="button"
                      role="option"
                      className={itemClass}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        navigateTo(vendor.href);
                      }}
                    >
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0F3460]/8 text-[#0F3460]">
                        {vendor.logoUrl ? (
                          <CatalogImage
                            src={vendor.logoUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : (
                          <Store className="h-5 w-5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-medium text-neutral-900">
                          {vendor.storeName}
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-xs text-neutral-500">
                          {[vendor.industryLabel, vendor.city, vendor.country]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </button>
                  ))}
                </SuggestGroup>
              ) : null}

              {result.industries.length > 0 ? (
                <SuggestGroup title={t("industries")}>
                  {result.industries.map((industry) => (
                    <button
                      key={industry.slug}
                      type="button"
                      role="option"
                      className={itemClass}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        navigateTo(industry.href);
                      }}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ec1b23]/8 text-[#ec1b23]">
                        <Tags className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-neutral-900">
                        {industry.label}
                      </span>
                    </button>
                  ))}
                </SuggestGroup>
              ) : null}

              {result.places.length > 0 ? (
                <SuggestGroup title={t("places")}>
                  {result.places.map((place) => (
                    <button
                      key={`${place.kind}-${place.label}`}
                      type="button"
                      role="option"
                      className={itemClass}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        navigateTo(place.href);
                      }}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-neutral-900">
                          {place.label}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                          {place.kind === "city" ? t("city") : t("country")}
                        </span>
                      </span>
                    </button>
                  ))}
                </SuggestGroup>
              ) : null}
            </>
          )}
        </div>

        <div className="border-t border-neutral-100 bg-neutral-50/80 px-3 py-2">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#ec1b23] transition hover:bg-white"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              navigateTo(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <Search className="h-4 w-4" />
            {t("viewAllResults", { query: query.trim() })}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <form
      ref={rootRef}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmitSearch();
        onOpenChange(false);
      }}
      className={formClass}
      role="search"
    >
      <button
        type="submit"
        className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#ec1b23] text-white transition-colors hover:bg-[#c4161d] ${
          variant === "desktop" ? "h-9 w-9" : "h-8 w-8"
        }`}
        aria-label={searchButtonLabel}
      >
        <Search size={variant === "desktop" ? 18 : 16} />
      </button>
      <input
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          onOpenChange(true);
        }}
        onFocus={() => {
          if (query.trim().length >= 2) onOpenChange(true);
        }}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent font-medium text-gray-900 outline-none placeholder:text-gray-400 ${
          variant === "desktop" ? "px-3 text-[14px]" : "px-2.5 text-[14px]"
        }`}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showPanel}
      />

      {query.trim() ? (
        <button
          type="button"
          onClick={clearQuery}
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          aria-label={t("clear")}
        >
          <X size={16} />
        </button>
      ) : null}

      {mounted ? createPortal(panel, document.body) : null}
    </form>
  );
}

function SuggestGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="py-1">
      <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}
