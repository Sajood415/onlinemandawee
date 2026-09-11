"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { useSliderOverflow } from "@/hooks/use-slider-overflow";
import { HomeSectionHeader } from "./HomeSectionHeader";

type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
  translations?: unknown;
};

type DisplayCategoryTile = {
  slug: string;
  href: string;
  label: string;
  image?: string;
  productCount?: number;
};

function formatCategoryLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function CategoryCircle({
  tile,
  noImageLabel,
  productsLabel,
}: {
  tile: DisplayCategoryTile;
  noImageLabel: string;
  productsLabel: (count: number) => string;
}) {
  return (
    <Link
      href={tile.href}
      aria-label={tile.label}
      className="group flex w-[100px] shrink-0 flex-col items-center gap-2.5 outline-none min-[390px]:w-[112px] sm:w-[124px]"
    >
      <div className="relative flex h-[92px] w-[92px] items-center justify-center min-[390px]:h-[104px] min-[390px]:w-[104px] sm:h-[118px] sm:w-[118px]">
        <div
          className="absolute inset-0 rounded-full bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-gray-100 transition group-hover:shadow-[0_12px_28px_rgba(236,27,35,0.12)] group-hover:ring-primary/25"
          aria-hidden
        />
        <div className="relative z-1 flex h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-full bg-[#F7F4EF] min-[390px]:h-[88px] min-[390px]:w-[88px] sm:h-[100px] sm:w-[100px]">
          {tile.image ? (
            <Image
              src={tile.image}
              alt=""
              fill
              className="object-contain object-center p-2 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 104px, 116px"
            />
          ) : (
            <span className="text-[10px] font-medium uppercase text-neutral-400">
              {noImageLabel}
            </span>
          )}
        </div>
      </div>
      <div className="w-full text-center">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-secondary">
          {tile.label}
        </p>
        {typeof tile.productCount === "number" ? (
          <p className="mt-0.5 text-xs text-gray-400">
            {productsLabel(tile.productCount)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function buildDisplayTiles(
  apiCategories: ApiCategory[],
  locale: SupportedLocale,
): DisplayCategoryTile[] {
  return apiCategories.map((category) => ({
    slug: category.slug,
    href: `/category/${category.slug}`,
    label: formatCategoryLabel(
      resolveCategoryLabel(
        category.slug,
        category.name,
        locale,
        category.translations,
      ),
    ),
    image: category.image,
    productCount: category.productCount,
  }));
}

export function HomeCategoryCarousel() {
  const t = useTranslations("Homepage.store");
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        const res = await fetch("/api/catalog/categories");
        if (!res.ok) return;
        const data = await parseApiResponse<ApiCategory[]>(res);
        if (mounted) setApiCategories(data);
      } catch {
        // keep section empty on API failure
      }
    };

    void loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  const tiles = useMemo(
    () => buildDisplayTiles(apiCategories, safeLocale),
    [apiCategories, safeLocale],
  );

  const { ref, isOverflowing, scrollBy } = useSliderOverflow<HTMLDivElement>([tiles.length]);

  if (tiles.length === 0) return null;

  return (
    <section className="w-full min-w-0">
      <HomeSectionHeader
        title={t("shopByCategory")}
        subtitle={t("shopByCategorySubtitle")}
        isRtl={isRtl}
        viewAllHref="/products"
        viewAllLabel={t("viewAllCategories")}
        centered
      />

      <div className="relative">
        {isOverflowing ? (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label={t("categories.previous")}
              className="absolute -left-3 top-[46px] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:flex min-[390px]:top-[52px] sm:top-[59px]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label={t("categories.next")}
              className="absolute -right-3 top-[46px] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:flex min-[390px]:top-[52px] sm:top-[59px]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div
          ref={ref}
          className={`flex gap-3 overflow-x-auto scroll-smooth px-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] min-[390px]:gap-4 sm:gap-6 sm:px-1 [&::-webkit-scrollbar]:hidden ${
            isOverflowing ? "justify-start" : "justify-center"
          }`}
        >
          {tiles.map((tile) => (
            <CategoryCircle
              key={tile.slug}
              tile={tile}
              noImageLabel={t("categories.noImage")}
              productsLabel={(count) => t("categories.productCount", { count })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
