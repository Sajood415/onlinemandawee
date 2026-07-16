"use client";

import { ArrowRight, Package, Store } from "lucide-react";
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
  const tIndustry = useTranslations("VendorPages.register.wizard.store.industryTypes");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const productLabel = vendor.productCount === 1 ? t("product") : t("products");

  const industryLabel = vendor.industryType
    ? (() => {
        try {
          return tIndustry(vendor.industryType);
        } catch {
          return vendor.industryType;
        }
      })()
    : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-neutral-200/80 bg-white transition hover:border-[#0F3460]/25">
      <div className="relative h-24 bg-linear-to-br from-[#0F3460]/12 via-[#0F3460]/4 to-transparent">
        <div className="absolute inset-x-4 -bottom-7">
          <div className="relative h-14 w-14 overflow-hidden border-2 border-white bg-white shadow-sm">
            {vendor.logoUrl ? (
              <CatalogImage
                src={vendor.logoUrl}
                alt={vendor.storeName}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#0F3460]/5 text-[#0F3460]">
                <Store className="h-6 w-6" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-10">
        {industryLabel ? (
          <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F3460]/80">
            {industryLabel}
          </span>
        ) : null}

        <h3 className="text-lg font-bold leading-snug text-neutral-900 transition group-hover:text-[#0F3460]">
          {vendor.storeName}
        </h3>

        {vendor.description ? (
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-neutral-500">
            {vendor.description}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
          <Package className="h-3.5 w-3.5" />
          {vendor.productCount} {productLabel}
        </div>

        <Link
          href={`/vendors/${vendor.storeSlug}`}
          className="mt-4 inline-flex items-center justify-center gap-2 bg-[#0F3460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
        >
          {t("viewStore")}
          <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
        </Link>
      </div>
    </article>
  );
}
