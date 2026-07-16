"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Handshake,
  HeartHandshake,
  PackageCheck,
  Scale,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function AboutShowcase() {
  const t = useTranslations("AboutPages.landing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";

  const offerItems = [
    t("offer.items.marketplace"),
    t("offer.items.checkout"),
    t("offer.items.guest"),
    t("offer.items.vendorTools"),
    t("offer.items.support"),
  ];

  const values = [
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: t("values.reliability.title"),
      description: t("values.reliability.description"),
    },
    {
      icon: <Scale className="h-5 w-5" />,
      title: t("values.fairness.title"),
      description: t("values.fairness.description"),
    },
    {
      icon: <HeartHandshake className="h-5 w-5" />,
      title: t("values.local.title"),
      description: t("values.local.description"),
    },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      {/* Split hero — brand-first */}
      <section className="w-full min-w-0 border-b border-black/5">
        <div className="mx-auto w-full max-w-[1540px] px-0">
          <div className="grid min-h-[360px] grid-cols-1 lg:min-h-[460px] lg:grid-cols-2">
            <div className="relative overflow-hidden bg-linear-to-br from-[#163f73] via-[#0F3460] to-[#0a2748] text-white">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.18),transparent_42%)]"
              />
              <div className="relative flex h-full flex-col justify-center px-4 py-10 sm:px-7 lg:px-10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  MandawEE · {t("eyebrow")}
                </p>
                <h1 className="mt-4 max-w-xl text-2xl font-bold leading-tight sm:text-3xl lg:text-[2.35rem]">
                  {t("title")}
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
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
                    href="/vendor/register"
                    className="inline-flex min-h-11 items-center justify-center border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {t("cta.sell")}
                  </Link>
                </div>
              </div>
            </div>
            <div className="relative min-h-[240px] lg:min-h-[460px]">
              <Image
                src="/vendor/seller-story.jpg"
                alt={t("heroImageAlt")}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission + visual */}
      <section className="w-full border-b border-black/5 bg-white">
        <div className="mx-auto grid w-full max-w-[1540px] grid-cols-1 lg:grid-cols-2">
          <div className="flex flex-col justify-center px-4 py-10 sm:px-7 lg:px-10 lg:py-14">
            <div className="mb-3 inline-flex text-[#0F3460]">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("mission.title")}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
              {t("mission.p1")}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
              {t("mission.p2")}
            </p>
          </div>
          <div className="relative min-h-[260px] lg:min-h-full">
            <Image
              src="/vendor/seller-map.jpg"
              alt={t("story.title")}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-[#0F3460]/25" />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#0F3460]/90 to-transparent px-5 py-6 sm:px-7">
              <h3 className="text-base font-bold text-white sm:text-lg">{t("story.title")}</h3>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/85">
                {t("story.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values — flat, no cards */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12">
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("values.title")}</h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">{t("values.subtitle")}</p>
          <div className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {values.map((value, index) => (
              <article key={value.title} className="min-w-0">
                <span className="block text-3xl font-bold tabular-nums text-[#0F3460]/20">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="mt-2 inline-flex text-[#0F3460]">{value.icon}</div>
                <h3 className="mt-2 text-base font-semibold text-neutral-900">{value.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="w-full border-t border-black/5 bg-white/70">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12">
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("offer.title")}</h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">{t("offer.subtitle")}</p>
          <ol className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
            {offerItems.map((item, index) => (
              <li key={item} className="flex gap-4 py-4 sm:gap-6">
                <span className="w-8 shrink-0 text-sm font-bold tabular-nums text-[#0F3460]/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-relaxed text-neutral-700 sm:text-base">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust + community */}
      <section className="w-full border-t border-black/5">
        <div className="mx-auto grid w-full max-w-[1540px] gap-10 px-4 py-10 sm:grid-cols-2 sm:gap-12 sm:px-6 sm:py-12">
          <article className="min-w-0">
            <div className="mb-3 inline-flex text-[#0F3460]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">{t("trust.title")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{t("trust.description")}</p>
          </article>
          <article className="min-w-0">
            <div className="mb-3 inline-flex text-[#0F3460]">
              <Store className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">{t("community.title")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {t("community.description")}
            </p>
          </article>
        </div>
      </section>

      {/* Explore links */}
      <section className="w-full border-t border-black/5 bg-white">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">{t("links.title")}</h2>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <PackageCheck className="h-4 w-4" />
              {t("links.howItWorks")}
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <Store className="h-4 w-4" />
              {t("links.help")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <Handshake className="h-4 w-4" />
              {t("links.contact")}
            </Link>
            <Link
              href="/vendor/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <Users className="h-4 w-4" />
              {t("links.sell")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
