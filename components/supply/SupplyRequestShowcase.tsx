"use client";

import Image from "next/image";
import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Loader2, Package } from "lucide-react";

import { SupplyRequestForm } from "@/components/supply/SupplyRequestForm";
import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

const HERO_IMAGE = "/images/carousals/slide-1.jpg";

export function SupplyRequestShowcase() {
  const t = useTranslations("SupplyPages.landing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";

  const steps = [
    {
      title: t("howItWorks.steps.describe.title"),
      description: t("howItWorks.steps.describe.description"),
    },
    {
      title: t("howItWorks.steps.quote.title"),
      description: t("howItWorks.steps.quote.description"),
    },
    {
      title: t("howItWorks.steps.deliver.title"),
      description: t("howItWorks.steps.deliver.description"),
    },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <section className="relative w-full min-w-0 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt={t("heroImageAlt")}
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-secondary/82" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_44%)]"
          />
        </div>

        <div className="relative mx-auto w-full max-w-[1540px] px-3.5 py-10 text-center sm:px-6 sm:py-12 lg:py-14">
          <nav className="mb-5 flex items-center justify-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {t("home")}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{t("title")}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {t("eyebrow")}
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {t("subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#supply-request"
              className="inline-flex min-h-11 items-center justify-center bg-white px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-neutral-100"
            >
              {t("cta.requestSupply")}
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center justify-center border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("cta.howItWorks")}
            </a>
          </div>
        </div>
      </section>

      <section id="supply-request" className="w-full min-w-0 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1540px] px-3.5 sm:px-6">
          <SupplyRequestForm locale={locale} />
        </div>
      </section>

      <section id="how-it-works" className="w-full border-t border-black/5">
        <div className="mx-auto w-full max-w-[1540px] px-3.5 py-10 sm:px-6 sm:py-12">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">
            {t("howItWorks.subtitle")}
          </p>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {steps.map((step, index) => (
              <li key={step.title} className="min-w-0">
                <span className="block text-3xl font-bold tabular-nums text-secondary/25">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold text-neutral-900">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="w-full border-t border-black/5 bg-white/50">
        <div className="mx-auto w-full max-w-[1540px] px-3.5 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
            <Package className="h-10 w-10 text-secondary/40" />
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
              {t("valueTitle")}
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-neutral-600">
              {t("valueSubtitle")}
            </p>
            <a
              href="#supply-request"
              className="mt-2 inline-flex bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
            >
              {t("cta.requestSupply")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SupplyRequestShowcasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eef1f6]">
          <Loader2 className="h-8 w-8 animate-spin text-secondary/40" />
        </div>
      }
    >
      <SupplyRequestShowcase />
    </Suspense>
  );
}
