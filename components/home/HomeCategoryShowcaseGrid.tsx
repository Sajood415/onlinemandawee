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
    <section className="w-full min-w-0 py-1 sm:py-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.categoryId}
            className="rounded-xl border border-neutral-200 bg-white p-2.5 sm:rounded-2xl sm:p-4"
          >
            <h3 className="line-clamp-2 text-center text-[13px] font-semibold text-neutral-800 sm:text-base">
              {card.categoryLabel}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {card.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group relative block overflow-hidden rounded-lg border border-neutral-100 bg-white"
                >
                  <div className="relative aspect-square">
                    <img
                      src={product.image}
                      alt={localizedProductName(product, safeLocale)}
                      className="block h-full w-full object-contain p-1 transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-3">
              <Link
                href={`/category/${card.categorySlug}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f77b8] hover:underline"
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
