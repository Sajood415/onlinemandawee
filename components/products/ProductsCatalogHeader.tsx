"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { useSliderOverflow } from "@/hooks/use-slider-overflow";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  translations?: unknown;
  children?: ApiCategory[];
};

type RailTile = {
  slug: string;
  href: string;
  label: string;
  image?: string;
};

type ProductsCatalogHeaderProps = {
  title: string;
  subtitle?: string;
  isRtl: boolean;
  categoryLabel?: string | null;
  parentCategory?: { slug: string; label: string } | null;
  activeCategorySlug?: string | null;
  showCategoryRail?: boolean;
  /** When set, show this category's subcategories instead of all top-level. */
  railParentSlug?: string | null;
};

function CategorySquare({
  href,
  label,
  image,
  noImageLabel,
  active,
}: {
  href: string;
  label: string;
  image?: string;
  noImageLabel: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="group flex w-[96px] shrink-0 flex-col items-center gap-2 outline-none min-[390px]:w-[108px] sm:w-[120px]"
    >
      {/* Outer frame holds the selection border so overflow-hidden on the image cannot clip it */}
      <div
        className={`w-full rounded-2xl border-2 p-0.5 transition duration-300 ${
          active
            ? "border-secondary shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
            : "border-transparent"
        }`}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-[14px] bg-[#F3F4F6] shadow-[0_4px_14px_rgba(15,23,42,0.06)] ring-1 ring-black/5 transition group-hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 108px, 120px"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-medium uppercase text-neutral-400">
              {noImageLabel}
            </span>
          )}
        </div>
      </div>
      <p
        className={`line-clamp-2 w-full text-center text-[11px] font-bold uppercase leading-snug tracking-wide min-[390px]:text-xs ${
          active ? "text-secondary" : "text-neutral-900"
        }`}
      >
        {label}
      </p>
    </Link>
  );
}

function toTile(
  category: ApiCategory,
  locale: SupportedLocale,
): RailTile {
  return {
    slug: category.slug,
    href: `/products/${encodeURIComponent(category.slug)}`,
    label: resolveCategoryLabel(
      category.slug,
      category.name,
      locale,
      category.translations,
    ),
    image: category.image,
  };
}

function buildRailTiles(
  categories: ApiCategory[],
  railParentSlug: string | null | undefined,
  locale: SupportedLocale,
): RailTile[] {
  if (!railParentSlug) {
    return categories.map((category) => toTile(category, locale));
  }

  for (const parent of categories) {
    if (parent.slug === railParentSlug) {
      const children = parent.children ?? [];
      return children.map((child) => toTile(child, locale));
    }
    const childMatch = (parent.children ?? []).find(
      (child) => child.slug === railParentSlug,
    );
    if (childMatch) {
      // On a subcategory page: show siblings under the same parent
      return (parent.children ?? []).map((child) => toTile(child, locale));
    }
  }

  return [];
}

export function ProductsCatalogHeader({
  title,
  subtitle,
  isRtl,
  categoryLabel,
  parentCategory = null,
  activeCategorySlug = null,
  showCategoryRail = true,
  railParentSlug = null,
}: ProductsCatalogHeaderProps) {
  const t = useTranslations("ProductsPages.catalog");
  const tHome = useTranslations("Homepage.store");
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    if (!showCategoryRail) return;
    let mounted = true;
    void fetch("/api/catalog/categories")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await parseApiResponse<ApiCategory[]>(res);
        if (mounted) setCategories(data);
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });
    return () => {
      mounted = false;
    };
  }, [showCategoryRail]);

  const tiles = useMemo(
    () => buildRailTiles(categories, railParentSlug, safeLocale),
    [categories, railParentSlug, safeLocale],
  );

  const { ref, isOverflowing, scrollBy } = useSliderOverflow<HTMLDivElement>([
    tiles.length,
    railParentSlug,
  ]);

  return (
    <div className="mb-6 sm:mb-8">
      <div className="mx-auto max-w-3xl text-center">
        <nav
          aria-label={t("title")}
          className="mb-3 flex flex-wrap items-center justify-center gap-1.5 text-sm text-neutral-400"
        >
          <Link href="/" className="transition hover:text-secondary hover:underline">
            {t("home")}
          </Link>
          <span aria-hidden className="text-neutral-300">
            /
          </span>
          {categoryLabel ? (
            <>
              <Link
                href="/products"
                className="transition hover:text-secondary hover:underline"
              >
                {t("title")}
              </Link>
              {parentCategory ? (
                <>
                  <span aria-hidden className="text-neutral-300">
                    /
                  </span>
                  <Link
                    href={`/products/${encodeURIComponent(parentCategory.slug)}`}
                    className="transition hover:text-secondary hover:underline"
                  >
                    {parentCategory.label}
                  </Link>
                </>
              ) : null}
              <span aria-hidden className="text-neutral-300">
                /
              </span>
              <span className="text-neutral-600">{categoryLabel}</span>
            </>
          ) : (
            <span className="text-neutral-600">{t("title")}</span>
          )}
        </nav>

        <h1 className="min-h-[2.5rem] text-3xl font-bold tracking-tight text-neutral-900 sm:min-h-[3rem] sm:text-4xl lg:min-h-[3.25rem] lg:text-[2.75rem]">
          {title || "\u00A0"}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>

      {showCategoryRail && tiles.length > 0 ? (
        <div className="relative mt-6 sm:mt-8">
          {isOverflowing ? (
            <>
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label={tHome("categories.previous")}
                className="absolute -left-2 top-[48px] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:flex min-[390px]:top-[54px] sm:top-[60px]"
              >
                <ChevronLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label={tHome("categories.next")}
                className="absolute -right-2 top-[48px] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:flex min-[390px]:top-[54px] sm:top-[60px]"
              >
                <ChevronRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              </button>
            </>
          ) : null}

          <div
            ref={ref}
            className={`flex gap-3 overflow-x-auto scroll-smooth pt-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] min-[390px]:gap-4 sm:gap-5 [&::-webkit-scrollbar]:hidden ${
              isOverflowing ? "justify-start" : "justify-center"
            }`}
          >
            {tiles.map((tile) => (
              <CategorySquare
                key={tile.slug}
                href={tile.href}
                label={tile.label}
                image={tile.image}
                noImageLabel={tHome("categories.noImage")}
                active={activeCategorySlug === tile.slug}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
