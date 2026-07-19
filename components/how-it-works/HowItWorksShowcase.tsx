"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  ClipboardList,
  CreditCard,
  HelpCircle,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function HowItWorksShowcase() {
  const t = useTranslations("HowItWorksPages.landing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";

  const steps = [
    {
      icon: <ShoppingBag className="h-5 w-5" />,
      title: t("steps.browse.title"),
      description: t("steps.browse.description"),
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: t("steps.checkout.title"),
      description: t("steps.checkout.description"),
    },
    {
      icon: <Package className="h-5 w-5" />,
      title: t("steps.fulfillment.title"),
      description: t("steps.fulfillment.description"),
    },
    {
      icon: <Truck className="h-5 w-5" />,
      title: t("steps.delivery.title"),
      description: t("steps.delivery.description"),
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      title: t("steps.track.title"),
      description: t("steps.track.description"),
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      title: t("steps.refunds.title"),
      description: t("steps.refunds.description"),
    },
  ];

  const tips = [t("tips.guest"), t("tips.multiVendor"), t("tips.refundWindow")];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <section className="relative overflow-hidden bg-linear-to-br from-[#163f73] via-[#0F3460] to-[#0a2748] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.16),transparent_42%)]"
        />
        <div className="relative mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Mandawee · {t("eyebrow")}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {t("subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:bg-neutral-100"
            >
              {t("cta.shop")}
            </Link>
            <Link
              href="/help"
              className="inline-flex min-h-11 items-center justify-center border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("cta.help")}
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("steps.title")}</h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">{t("steps.subtitle")}</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center bg-[#0F3460]/10 text-[#0F3460]">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-[#0F3460]/20">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-black/5 bg-white/70">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">{t("tips.title")}</h2>
          <ul className="mt-5 space-y-3">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-3 text-sm leading-relaxed text-neutral-700">
                <span
                  className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#0F3460]"
                  aria-hidden
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="w-full border-t border-black/5 bg-white">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">{t("links.title")}</h2>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <ShoppingBag className="h-4 w-4" />
              {t("links.products")}
            </Link>
            <Link
              href="/refunds"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <RefreshCw className="h-4 w-4" />
              {t("links.refunds")}
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <HelpCircle className="h-4 w-4" />
              {t("links.help")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <MapPin className="h-4 w-4" />
              {t("links.contact")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
