"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { HawalaTransferForm } from "@/components/hawala/HawalaTransferForm";
import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function HawalaShowcase() {
  const t = useTranslations("HawalaPages.landing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";

  const steps = [
    {
      title: t("howItWorks.steps.submit.title"),
      description: t("howItWorks.steps.submit.description"),
    },
    {
      title: t("howItWorks.steps.review.title"),
      description: t("howItWorks.steps.review.description"),
    },
    {
      title: t("howItWorks.steps.track.title"),
      description: t("howItWorks.steps.track.description"),
    },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      {/* Compact full-bleed hero — then straight into the form */}
      <section className="relative w-full min-w-0 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/vendor/seller-map.jpg"
            alt={t("heroImageAlt")}
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[#0F3460]/88" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_45%)]"
          />
        </div>
        <div className="relative mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            MandawEE · {t("eyebrow")}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Form immediately under hero */}
      <section id="hawala-form" className="relative w-full min-w-0 -mt-1">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
          <HawalaTransferForm />
        </div>
      </section>

      {/* How it works — flat numbered row, no cards */}
      <section id="how-it-works" className="w-full border-t border-black/5">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 sm:py-12">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">{t("howItWorks.subtitle")}</p>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {steps.map((step, index) => (
              <li key={step.title} className="min-w-0">
                <span className="block text-3xl font-bold tabular-nums text-[#0F3460]/25">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust — single line of text, no cards */}
      <section className="w-full border-t border-black/5 bg-white/60">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6">
          <p className="text-sm font-semibold text-neutral-900">{t("trust.title")}</p>
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
            {t("trust.rates.description")} · {t("trust.review.description")} ·{" "}
            {t("trust.tracking.description")}
          </p>
        </div>
      </section>

      {/* FAQ — hairline dividers only */}
      <section className="w-full border-t border-black/5">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 sm:py-12">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">{t("faq.title")}</h2>
          <div className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
            <FaqItem
              question={t("faq.items.rates.question")}
              answer={t("faq.items.rates.answer")}
            />
            <FaqItem
              question={t("faq.items.timing.question")}
              answer={t("faq.items.timing.answer")}
            />
            <FaqItem
              question={t("faq.items.account.question")}
              answer={t("faq.items.account.answer")}
            />
            <FaqItem
              question={t("faq.items.support.question")}
              answer={t("faq.items.support.answer")}
            />
          </div>
          <p className="mt-8 text-sm text-neutral-500">
            {t("finalCta.subtitle")}{" "}
            <Link href="/contact" className="font-semibold text-[#0F3460] underline-offset-2 hover:underline">
              {t("finalCta.contactSupport")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-neutral-900">
        <span>{question}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">{answer}</p>
    </details>
  );
}
