"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";

const MAX_CATEGORY_CARDS = 4;
const PRODUCTS_PER_CARD = 4;
const CATEGORY_SCAN_LIMIT = 12;

type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  translations?: unknown;
};

type ShowcaseCard = {
  categoryId: string;
  categorySlug: string;
  categoryLabel: string;
  products: PublicCatalogProduct[];
};

function localizedProductName(product: PublicCatalogProduct, locale: SupportedLocale) {
  return product.name[locale] || product.name.en;
}

export function HomeCategoryShowcaseGrid() {
  const t = useTranslations("Homepage.store");
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale = locale === "ps" || locale === "fa-AF" ? locale : "en";

  const [cards, setCards] = useState<ShowcaseCard[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const categoriesRes = await fetch("/api/catalog/categories");

        if (!categoriesRes.ok) {
          if (mounted) setCards([]);
          return;
        }

        const categories = await parseApiResponse<ApiCategory[]>(categoriesRes);
        const categoryCandidates = categories.slice(0, CATEGORY_SCAN_LIMIT);
        const cardsWithMaybeNull = await Promise.all(
          categoryCandidates.map(async (category) => {
            const categoryProducts = await fetchPublicCatalogProducts({
              category: category.slug,
            });
            if (categoryProducts.length === 0) return null;

            return {
              categoryId: category.id,
              categorySlug: category.slug,
              categoryLabel: resolveCategoryLabel(
                category.slug,
                category.name,
                safeLocale,
                category.translations,
              ),
              products: categoryProducts.slice(0, PRODUCTS_PER_CARD),
            } satisfies ShowcaseCard;
          }),
        );

        const nextCards = cardsWithMaybeNull
          .filter((card): card is ShowcaseCard => card !== null)
          .slice(0, MAX_CATEGORY_CARDS);

        if (mounted) setCards(nextCards);
      } catch {
        if (mounted) setCards([]);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [safeLocale]);

  const isRtl = safeLocale === "ps" || safeLocale === "fa-AF";
  const viewIcon = useMemo(
    () => (isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />),
    [isRtl],
  );

  if (cards.length === 0) return null;

  return (
    <section className="w-full min-w-0">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
          {t("selectedCategories")}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.categoryId}
            className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] sm:p-4"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-3">
              <h3 className="line-clamp-1 text-xs font-bold text-secondary sm:text-base">
                {card.categoryLabel}
              </h3>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary sm:h-7 sm:min-w-7 sm:px-2 sm:text-xs">
                {card.products.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {card.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group relative block aspect-square overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={localizedProductName(product, safeLocale)}
                    className="block h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                </Link>
              ))}
            </div>
            <div className="mt-2.5 sm:mt-3">
              <Link
                href={`/category/${card.categorySlug}`}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#0a2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:px-3 sm:py-1.5 sm:text-xs"
              >
                {viewIcon}
                <span>{t("viewAll")}</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
