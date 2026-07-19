"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Loader2, Store } from "lucide-react";

import { VendorCard } from "@/components/vendors/VendorCard";
import type { IndustryType } from "@/domain/vendor/vendor-types";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import {
  featuredIndustryTypes,
  getAllIndustryTypes,
  getSecondaryIndustryTypes,
} from "@/lib/vendors/industry-display";
import {
  fetchPublicVendorListings,
  type PublicVendorListing,
} from "@/lib/vendors/public-vendor-listing";

function isIndustryType(value: string | null): value is IndustryType {
  if (!value) return false;
  return getAllIndustryTypes().includes(value as IndustryType);
}

function IndustryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-1.5 text-sm font-semibold transition ${
        active
          ? "border-[#0F3460] text-[#0F3460]"
          : "border-transparent text-neutral-600 hover:text-[#0F3460]"
      }`}
    >
      {label}
    </button>
  );
}

export function VendorsShowcase() {
  const t = useTranslations("VendorsPages.listing");
  const tIndustry = useTranslations("VendorPages.register.wizard.store.industryTypes");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
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

  const industryLabel = (industry: IndustryType) => {
    try {
      return tIndustry(industry);
    } catch {
      return industry;
    }
  };

  const headerSubtitle = selectedIndustry
    ? industryLabel(selectedIndustry)
    : t("subtitle");

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <section className="relative overflow-hidden bg-linear-to-br from-[#163f73] via-[#0F3460] to-[#0a2748] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.16),transparent_42%)]"
        />
        <div className="relative mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {t("home")}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 opacity-70 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{t("title")}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Mandawee · {t("eyebrow")}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {headerSubtitle}
          </p>
          <p className="mt-4 text-sm text-white/75">
            {loading ? "…" : t("results", { count: vendors.length })}
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 space-y-5 border-b border-neutral-200/80 pb-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <IndustryChip
              active={selectedIndustry === null}
              label={t("allIndustries")}
              onClick={() => selectIndustry(null)}
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              {t("featuredIndustries")}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {featuredIndustryTypes.map((industry) => (
                <IndustryChip
                  key={industry}
                  active={selectedIndustry === industry}
                  label={industryLabel(industry)}
                  onClick={() => selectIndustry(industry)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              {t("moreIndustries")}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {secondaryIndustries.map((industry) => (
                <IndustryChip
                  key={industry}
                  active={selectedIndustry === industry}
                  label={industryLabel(industry)}
                  onClick={() => selectIndustry(industry)}
                />
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0F3460]/40" />
          </div>
        ) : vendors.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        ) : (
          <div className="border border-neutral-200/80 bg-white px-6 py-16 text-center">
            <Store className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
            <h2 className="text-xl font-bold text-neutral-900">{t("noVendors")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{t("noVendorsHint")}</p>
            {selectedIndustry ? (
              <button
                type="button"
                onClick={() => selectIndustry(null)}
                className="mt-6 inline-flex bg-[#0F3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
              >
                {t("clearFilter")}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
