"use client";

import { PackageSearch } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link as LocaleLink } from "@/i18n/navigation";

export function HomeSupplyRequestCta() {
  const t = useTranslations("Homepage.supplyCta");

  return (
    <section className="mt-6 sm:mt-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f3460] via-[#1a4a7a] to-[#ec1b23] px-5 py-6 sm:px-8 sm:py-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              <PackageSearch className="h-3.5 w-3.5" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">{t("title")}</h2>
            <p className="mt-1 text-sm text-white/85 sm:text-base">{t("subtitle")}</p>
          </div>
          <LocaleLink
            href="/supply-request"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0f3460] shadow-sm transition hover:bg-neutral-100"
          >
            {t("cta")}
          </LocaleLink>
        </div>
      </div>
    </section>
  );
}
