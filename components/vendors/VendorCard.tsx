"use client";

import Link from "next/link";
import { ArrowRight, Package, Store } from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { getVendorsCopy } from "@/components/vendors/copy";
import { getIndustryLabel } from "@/lib/vendors/industry-display";
import type { PublicVendorListing } from "@/lib/vendors/public-vendor-listing";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type VendorCardProps = {
  vendor: PublicVendorListing;
  locale: SupportedLocale;
};

export function VendorCard({ vendor, locale }: VendorCardProps) {
  const copy = getVendorsCopy(locale);
  const isRtl = locale !== "en";
  const productLabel =
    vendor.productCount === 1 ? copy.product : copy.products;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_10px_35px_rgba(15,52,96,0.06)] transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_16px_45px_rgba(15,52,96,0.1)]">
      <div className="relative h-28 bg-gradient-to-br from-[#0f3460]/8 via-[#0f3460]/4 to-transparent">
        <div className="absolute inset-x-5 -bottom-8">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
            {vendor.logoUrl ? (
              <CatalogImage
                src={vendor.logoUrl}
                alt={vendor.storeName}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#0f3460]/5 text-[#0f3460]">
                <Store className="h-7 w-7" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-12">
        {vendor.industryType ? (
          <span className="mb-2 inline-flex w-fit rounded-full bg-[#0f3460]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0f3460]">
            {getIndustryLabel(vendor.industryType)}
          </span>
        ) : null}

        <h3 className="text-lg font-bold leading-snug text-neutral-900 transition group-hover:text-[#0f3460]">
          {vendor.storeName}
        </h3>

        {vendor.description ? (
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-500">
            {vendor.description}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
          <Package className="h-3.5 w-3.5" />
          {vendor.productCount} {productLabel}
        </div>

        <Link
          href={`/vendors/${vendor.storeSlug}`}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          {copy.viewStore}
          <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
        </Link>
      </div>
    </article>
  );
}
