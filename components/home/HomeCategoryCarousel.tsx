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
  translations?: unknown;
};

type DisplayCategoryTile = {
  slug: string;
  href: string;
  label: string;
  image?: string;
};

function CategorySquare({
  tile,
  noImageLabel,
}: {
  tile: DisplayCategoryTile;
  noImageLabel: string;
}) {
  return (
    <Link
      href={tile.href}
      aria-label={tile.label}
      className="group flex w-[108px] shrink-0 flex-col items-center gap-2.5 outline-none min-[390px]:w-[124px] sm:w-[140px] lg:w-[152px]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F3F4F6] shadow-[0_4px_14px_rgba(15,23,42,0.06)] ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
        {tile.image ? (
          <Image
            src={tile.image}
            alt=""
            fill
            className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 124px, 152px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-medium uppercase text-neutral-400">
            {noImageLabel}
          </span>
        )}
      </div>
      <p className="line-clamp-2 w-full text-center text-[11px] font-bold uppercase leading-snug tracking-wide text-neutral-900 min-[390px]:text-xs sm:text-sm">
        {tile.label}
      </p>
    </Link>
  );
}

function buildDisplayTiles(
  apiCategories: ApiCategory[],
  locale: SupportedLocale,
): DisplayCategoryTile[] {
  return apiCategories.map((category) => ({
    slug: category.slug,
    href: `/products/${category.slug}`,
    label: resolveCategoryLabel(
      category.slug,
      category.name,
      locale,
      category.translations,
    ),
    image: category.image,
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
              className="absolute -left-3 top-[54px] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:flex min-[390px]:top-[62px] sm:top-[70px] lg:top-[76px]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label={t("categories.next")}
              className="absolute -right-3 top-[54px] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:flex min-[390px]:top-[62px] sm:top-[70px] lg:top-[76px]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div
          ref={ref}
          className={`flex gap-3 overflow-x-auto scroll-smooth px-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] min-[390px]:gap-4 sm:gap-5 sm:px-1 lg:gap-6 [&::-webkit-scrollbar]:hidden ${
            isOverflowing ? "justify-start" : "justify-center"
          }`}
        >
          {tiles.map((tile) => (
            <CategorySquare
              key={tile.slug}
              tile={tile}
              noImageLabel={t("categories.noImage")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
