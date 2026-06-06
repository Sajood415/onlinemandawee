"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { ChevronRight, Loader2, Store } from "lucide-react";

import { VendorCard } from "@/components/vendors/VendorCard";
import { getVendorsCopy } from "@/components/vendors/copy";
import type { IndustryType } from "@/domain/vendor/vendor-types";
import {
  featuredIndustryTypes,
  getAllIndustryTypes,
  getIndustryLabel,
  getSecondaryIndustryTypes,
} from "@/lib/vendors/industry-display";
import {
  fetchPublicVendorListings,
  type PublicVendorListing,
} from "@/lib/vendors/public-vendor-listing";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { usePathname, useRouter } from "@/i18n/navigation";

function isIndustryType(value: string | null): value is IndustryType {
  if (!value) return false;
  return getAllIndustryTypes().includes(value as IndustryType);
}

function VendorsPageContent() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getVendorsCopy(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const internalIndustryUpdate = useRef(false);

  const initialIndustry = searchParams.get("industry");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | null>(
    isIndustryType(initialIndustry) ? initialIndustry : null
  );
  const [vendors, setVendors] = useState<PublicVendorListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (internalIndustryUpdate.current) {
      internalIndustryUpdate.current = false;
      return;
    }
    const industry = searchParams.get("industry");
    setSelectedIndustry(isIndustryType(industry) ? industry : null);
  }, [searchParams]);

  useEffect(() => {
    const current = searchParams.get("industry") ?? "";
    const next = selectedIndustry ?? "";
    if (current === next) return;

    const params = new URLSearchParams(searchParams.toString());
    if (selectedIndustry) {
      params.set("industry", selectedIndustry);
    } else {
      params.delete("industry");
    }

    internalIndustryUpdate.current = true;
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectedIndustry]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const listings = await fetchPublicVendorListings(
          selectedIndustry ? { industry: selectedIndustry } : undefined
        );
        if (mounted) setVendors(listings);
      } catch {
        if (mounted) setVendors([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [selectedIndustry]);

  const selectIndustry = useCallback((industry: IndustryType | null) => {
    setSelectedIndustry(industry);
  }, []);

  const secondaryIndustries = useMemo(() => getSecondaryIndustryTypes(), []);

  const headerSubtitle = selectedIndustry
    ? getIndustryLabel(selectedIndustry)
    : copy.subtitle;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <section className="border-b border-[#0f3460]/10 bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {copy.home}
            </Link>
            <ChevronRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{copy.title}</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
                <Store className="h-3.5 w-3.5" />
                Marketplace vendors
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
                {headerSubtitle}
              </p>
              <p className="mt-3 text-sm text-white/80">
                <span className="font-semibold text-white">{loading ? "…" : vendors.length}</span>{" "}
                {copy.results}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectIndustry(null)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedIndustry === null
                  ? "bg-[#0f3460] text-white shadow-md"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
              }`}
            >
              {copy.allIndustries}
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
              {copy.featuredIndustries}
            </p>
            <div className="flex flex-wrap gap-2">
              {featuredIndustryTypes.map((industry) => (
                <button
                  key={industry}
                  type="button"
                  onClick={() => selectIndustry(industry)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedIndustry === industry
                      ? "bg-primary text-white shadow-md"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {getIndustryLabel(industry)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
              {copy.moreIndustries}
            </p>
            <div className="flex flex-wrap gap-2">
              {secondaryIndustries.map((industry) => (
                <button
                  key={industry}
                  type="button"
                  onClick={() => selectIndustry(industry)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedIndustry === industry
                      ? "bg-primary text-white shadow-md"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {getIndustryLabel(industry)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0f3460]/40" />
          </div>
        ) : vendors.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
            <Store className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
            <h2 className="text-xl font-bold text-neutral-900">{copy.noVendors}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{copy.noVendorsHint}</p>
            {selectedIndustry ? (
              <button
                type="button"
                onClick={() => selectIndustry(null)}
                className="mt-6 rounded-xl bg-[#0f3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
              >
                {copy.clearFilter}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VendorsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0f3460]/40" />
        </div>
      }
    >
      <VendorsPageContent />
    </Suspense>
  );
}
