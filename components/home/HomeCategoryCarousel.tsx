"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { useHorizontalScroll } from "./useHorizontalScroll";

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

function formatCategoryLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function CategoryCircle({ tile }: { tile: DisplayCategoryTile }) {
  return (
    <Link
      href={tile.href}
      aria-label={tile.label}
      className="group flex w-[104px] shrink-0 flex-col items-center gap-2.5 outline-none sm:w-[116px]"
    >
      <div className="relative flex h-[96px] w-[96px] items-center justify-center sm:h-[106px] sm:w-[106px]">
        <div className="absolute inset-0 rounded-full bg-[#f0f0f1]" aria-hidden />
        <div className="relative z-1 flex h-[80px] w-[80px] items-center justify-center overflow-hidden rounded-full bg-white sm:h-[88px] sm:w-[88px]">
          {tile.image ? (
            <Image
              src={tile.image}
              alt=""
              fill
              className="object-contain object-center transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 104px, 116px"
            />
          ) : (
            <span className="text-[10px] font-medium uppercase text-neutral-400">No image</span>
          )}
        </div>
      </div>
      <p className="line-clamp-2 w-full text-center text-[11px] font-normal leading-snug text-neutral-800 sm:text-xs">
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
  }));
}

export function HomeCategoryCarousel() {
  const t = useTranslations("Homepage.store");
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const { ref, scroll } = useHorizontalScroll();

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

  if (tiles.length === 0) return null;

  return (
    <section className="w-full min-w-0 py-6 sm:py-8">
      <h2 className="mb-6 text-center text-base font-bold text-neutral-900 sm:mb-8 sm:text-lg">
        {t("shopByCategory")}
      </h2>

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="absolute -left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/90 text-neutral-500 shadow-sm transition hover:bg-white hover:text-neutral-700 sm:flex"
          aria-label="Previous categories"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          className="absolute -right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/90 text-neutral-500 shadow-sm transition hover:bg-white hover:text-neutral-700 sm:flex"
          aria-label="Next categories"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
        >
          {tiles.map((tile) => (
            <CategoryCircle key={tile.slug} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  );
}
