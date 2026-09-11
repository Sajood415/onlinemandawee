"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  fetchPublicShopTypes,
  type PublicShopTypeOption,
} from "@/lib/vendors/public-vendor-listing";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { useSliderOverflow } from "@/hooks/use-slider-overflow";
import { HomeSectionHeader } from "./HomeSectionHeader";

type DisplayTile = {
  slug: string;
  href: string;
  label: string;
  image?: string | null;
};

function formatLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function ShopTypeCircle({
  tile,
  noImageLabel,
}: {
  tile: DisplayTile;
  noImageLabel: string;
}) {
  return (
    <Link
      href={tile.href}
      aria-label={tile.label}
      className="group flex w-[88px] flex-col items-center gap-2 outline-none min-[390px]:w-[96px] sm:w-[108px] lg:w-[116px]"
    >
      <div className="relative h-[76px] w-[76px] overflow-hidden rounded-full bg-[#EEF0F3] min-[390px]:h-[84px] min-[390px]:w-[84px] sm:h-[96px] sm:w-[96px] lg:h-[104px] lg:w-[104px]">
        {tile.image ? (
          <Image
            src={tile.image}
            alt=""
            fill
            className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 96px, 116px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-medium uppercase text-neutral-400">
            {noImageLabel}
          </span>
        )}
      </div>
      <p className="line-clamp-2 w-full text-center text-xs font-semibold leading-snug text-neutral-900 sm:text-sm">
        {tile.label}
      </p>
    </Link>
  );
}

function buildTiles(types: PublicShopTypeOption[]): DisplayTile[] {
  return types.map((type) => ({
    slug: type.slug,
    href: `/vendors?industry=${encodeURIComponent(type.slug)}`,
    label: formatLabel(type.label),
    image: type.image,
  }));
}

export function HomeShopTypeCarousel() {
  const t = useTranslations("Homepage.store");
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const [shopTypes, setShopTypes] = useState<PublicShopTypeOption[]>([]);

  useEffect(() => {
    let mounted = true;
    void fetchPublicShopTypes(safeLocale)
      .then((types) => {
        if (mounted) setShopTypes(types);
      })
      .catch(() => {
        if (mounted) setShopTypes([]);
      });
    return () => {
      mounted = false;
    };
  }, [safeLocale]);

  const tiles = useMemo(() => buildTiles(shopTypes), [shopTypes]);
  const { ref: scrollRef, isOverflowing, scrollBy } = useSliderOverflow<HTMLDivElement>([tiles.length]);

  if (tiles.length === 0) return null;

  return (
    <section className="w-full min-w-0">
      <HomeSectionHeader
        title={t("shopByVendorType")}
        isRtl={isRtl}
        viewAllHref="/vendors"
        viewAllLabel={t("viewAllShopTypes")}
        centered
      />

      <div className="relative">
        {isOverflowing ? (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label={t("shopTypes.previous")}
              className="absolute -left-3 top-[38px] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:flex min-[390px]:top-[42px] sm:top-[48px] lg:top-[52px]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label={t("shopTypes.next")}
              className="absolute -right-3 top-[38px] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:flex min-[390px]:top-[42px] sm:top-[48px] lg:top-[52px]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div
          ref={scrollRef}
          className={`flex gap-x-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] min-[390px]:gap-x-4 sm:gap-x-5 [&::-webkit-scrollbar]:hidden ${
            isOverflowing ? "justify-start" : "justify-center"
          }`}
        >
          {tiles.map((tile) => (
            <ShopTypeCircle
              key={tile.slug}
              tile={tile}
              noImageLabel={t("shopTypes.noImage")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
