"use client";

import { ArrowRight, MapPin, Package, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import type { PublicVendorListing } from "@/lib/vendors/public-vendor-listing";

type VendorCardProps = {
  vendor: PublicVendorListing;
};

export function VendorCard({ vendor }: VendorCardProps) {
  const t = useTranslations("VendorsPages.listing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const productLabel = vendor.productCount === 1 ? t("product") : t("products");

  const industryLabel = vendor.industryLabel ?? vendor.industryType ?? null;
  const location = [vendor.city, vendor.country].filter(Boolean).join(", ");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_30px_rgba(15,52,96,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-secondary/25 hover:shadow-[0_20px_50px_rgba(15,52,96,0.12)]">
      <div className="relative h-16 overflow-hidden bg-gradient-to-br from-secondary/15 via-secondary/5 to-transparent">
        <Store
          className="absolute -right-3 -top-3 h-20 w-20 text-secondary/10 rtl:-left-3 rtl:right-auto"
          strokeWidth={1.25}
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="-mt-8 mb-3 flex items-end justify-between gap-2">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md transition-transform duration-300 group-hover:scale-105">
            {vendor.logoUrl ? (
              <CatalogImage
                src={vendor.logoUrl}
                alt={vendor.storeName}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary/5 text-secondary">
                <Store className="h-6 w-6" />
              </div>
            )}
          </div>
          {industryLabel ? (
            <span className="mb-1 inline-flex max-w-[55%] items-center truncate rounded-full bg-secondary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-secondary/80">
              {industryLabel}
            </span>
          ) : null}
        </div>

        <h3 className="text-lg font-bold leading-snug text-neutral-900 transition group-hover:text-secondary">
          {vendor.storeName}
        </h3>

        {vendor.description ? (
          <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-neutral-500">
            {vendor.description}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        {location ? (
          <p className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
            <Package className="h-3.5 w-3.5" />
            {vendor.productCount} {productLabel}
          </div>

          <Link
            href={`/vendors/${vendor.storeSlug}`}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0a2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            {t("viewStore")}
            <ArrowRight className={`h-3.5 w-3.5 ${isRtl ? "rotate-180" : ""}`} />
          </Link>
        </div>
      </div>
    </article>
  );
}
