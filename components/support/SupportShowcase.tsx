"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck,
  ChevronDown,
  Clock3,
  Headphones,
  HelpCircle,
  Mail,
  MessageSquareText,
  PackageSearch,
  Phone,
  Store,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { SITE_CONTACT } from "@/lib/content/contact-info";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function SupportShowcase() {
  const t = useTranslations("SupportPages.landing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";

  const channels = [
    {
      icon: <Mail className="h-5 w-5" />,
      label: t("channels.email.label"),
      value: SITE_CONTACT.email,
      href: `mailto:${SITE_CONTACT.email}`,
      hint: t("channels.email.hint"),
    },
    {
      icon: <Phone className="h-5 w-5" />,
      label: t("channels.phone.label"),
      value: SITE_CONTACT.phoneDisplay,
      href: `tel:${SITE_CONTACT.phoneTel}`,
      hint: t("channels.phone.hint"),
    },
  ];

  const topics = [
    {
      icon: <PackageSearch className="h-5 w-5" />,
      title: t("topics.orders.title"),
      description: t("topics.orders.description"),
    },
    {
      icon: <Store className="h-5 w-5" />,
      title: t("topics.vendors.title"),
      description: t("topics.vendors.description"),
    },
    {
      icon: <MessageSquareText className="h-5 w-5" />,
      title: t("topics.account.title"),
      description: t("topics.account.description"),
    },
    {
      icon: <BadgeCheck className="h-5 w-5" />,
      title: t("topics.refunds.title"),
      description: t("topics.refunds.description"),
    },
  ];

  const tips = [
    t("tips.items.helpCenter"),
    t("tips.items.refundPolicy"),
    t("tips.items.orderNumber"),
    t("tips.items.accountStatus"),
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#f2f3f7]">
      <section className="w-full min-w-0 border-b border-black/5">
        <div className="mx-auto w-full max-w-[1540px] px-0">
          <div className="grid min-h-[360px] grid-cols-1 lg:min-h-[440px] lg:grid-cols-2">
            <div className="relative overflow-hidden bg-linear-to-br from-[#163f73] via-[#0F3460] to-[#0a2748] text-white">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.18),transparent_42%)]"
              />
              <div className="relative flex h-full flex-col justify-center px-4 py-10 sm:px-7 lg:px-10">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
                  <Headphones className="h-4 w-4" aria-hidden />
                  {t("eyebrow")}
                </span>
                <h1 className="mt-4 max-w-xl text-2xl font-bold leading-tight sm:text-3xl lg:text-[2.25rem]">
                  {t("title")}
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
                  {t("subtitle")}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${SITE_CONTACT.email}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] shadow-sm transition hover:bg-neutral-100"
                  >
                    {t("cta.emailUs")}
                  </a>
                  <a
                    href="#support-channels"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {t("cta.viewChannels")}
                  </a>
                </div>
              </div>
            </div>
            <div className="relative min-h-[240px] lg:min-h-[440px]">
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

      <section id="support-channels" className="w-full min-w-0 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1540px] px-2 sm:px-4">
          <div className="mb-4 px-1">
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("channels.title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 sm:text-base">{t("channels.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {channels.map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3460]/10 text-[#0F3460]">
                  {channel.icon}
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {channel.label}
                </p>
                <p className="mt-1 text-lg font-bold text-neutral-900 group-hover:text-[#0F3460]">
                  <bdi>{channel.value}</bdi>
                </p>
                <p className="mt-1 text-sm text-neutral-600">{channel.hint}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 py-2 sm:py-4">
        <div className="mx-auto w-full max-w-[1540px] px-2 sm:px-4">
          <div className="mb-3 px-1">
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("topics.title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 sm:text-base">{t("topics.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic) => (
              <article
                key={topic.title}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3460]/10 text-[#0F3460]">
                  {topic.icon}
                </div>
                <h3 className="mt-3 text-sm font-bold text-neutral-900 sm:text-base">{topic.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{topic.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1540px] px-0">
          <div className="grid grid-cols-1 overflow-hidden border-y border-black/5 bg-white lg:grid-cols-2">
            <div className="flex h-full flex-col justify-center px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("tips.title")}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
                {t("tips.subtitle")}
              </p>
              <ul className="mt-5 space-y-2">
                {tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-2 rounded-lg bg-[#fafafa] px-3 py-2 text-sm text-neutral-700"
                  >
                    <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[#0F3460]" aria-hidden />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/help"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                >
                  {t("links.helpCenter")}
                </Link>
                <Link
                  href="/refunds"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                >
                  {t("links.refundPolicy")}
                </Link>
              </div>
            </div>
            <div className="flex h-full flex-col justify-center bg-[#0F3460] px-4 py-6 text-white sm:px-7 lg:px-10 lg:py-8">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Clock3 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-bold sm:text-2xl">{t("response.title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">
                {t("response.description")}
              </p>
              <div className="mt-5 space-y-2">
                <ResponseRow label={t("response.email")} value={t("response.emailValue")} />
                <ResponseRow label={t("response.phone")} value={t("response.phoneValue")} />
                <ResponseRow label={t("response.disputes")} value={t("response.disputesValue")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 py-2 sm:py-4">
        <div className="mx-auto w-full max-w-[1540px] px-2 sm:px-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-base font-bold text-neutral-900 sm:text-lg">{t("faq.title")}</h3>
            <div className="mt-4 space-y-2">
              <FaqItem question={t("faq.items.orders.question")} answer={t("faq.items.orders.answer")} />
              <FaqItem question={t("faq.items.vendors.question")} answer={t("faq.items.vendors.answer")} />
              <FaqItem question={t("faq.items.hours.question")} answer={t("faq.items.hours.answer")} />
              <FaqItem question={t("faq.items.refunds.question")} answer={t("faq.items.refunds.answer")} />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 px-2 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto w-full max-w-[1540px]">
          <div className="rounded-2xl bg-[#0F3460] px-4 py-5 text-white sm:px-6 sm:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-sm text-white/80">
                  <HelpCircle className="h-4 w-4" />
                  {t("finalCta.eyebrow")}
                </div>
                <h3 className="text-lg font-bold sm:text-xl">{t("finalCta.title")}</h3>
                <p className="mt-1 text-sm text-white/85">{t("finalCta.subtitle")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${SITE_CONTACT.email}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:bg-neutral-100"
                >
                  {t("finalCta.email")}
                </a>
                <a
                  href={`tel:${SITE_CONTACT.phoneTel}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {t("finalCta.call")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResponseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-neutral-800">
        <span>{question}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-2 border-t border-neutral-200 pt-2 text-sm leading-relaxed text-neutral-600">{answer}</p>
    </details>
  );
}
