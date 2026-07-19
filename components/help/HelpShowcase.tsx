"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronDown,
  CreditCard,
  HelpCircle,
  Mail,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { SITE_CONTACT } from "@/lib/content/contact-info";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type FaqItem = { question: string; answer: string };

type TopicGroup = {
  id: string;
  icon: ReactNode;
  title: string;
  items: FaqItem[];
};

export function HelpShowcase() {
  const t = useTranslations("HelpPages.landing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";

  const topics: TopicGroup[] = [
    {
      id: "orders",
      icon: <ShoppingBag className="h-5 w-5" />,
      title: t("faq.orders.title"),
      items: [
        { question: t("faq.orders.guest.question"), answer: t("faq.orders.guest.answer") },
        { question: t("faq.orders.split.question"), answer: t("faq.orders.split.answer") },
      ],
    },
    {
      id: "payments",
      icon: <CreditCard className="h-5 w-5" />,
      title: t("faq.payments.title"),
      items: [
        { question: t("faq.payments.methods.question"), answer: t("faq.payments.methods.answer") },
        { question: t("faq.payments.charged.question"), answer: t("faq.payments.charged.answer") },
      ],
    },
    {
      id: "delivery",
      icon: <Truck className="h-5 w-5" />,
      title: t("faq.delivery.title"),
      items: [
        {
          question: t("faq.delivery.calculated.question"),
          answer: t("faq.delivery.calculated.answer"),
        },
        { question: t("faq.delivery.status.question"), answer: t("faq.delivery.status.answer") },
      ],
    },
    {
      id: "accounts",
      icon: <UserRound className="h-5 w-5" />,
      title: t("faq.accounts.title"),
      items: [
        {
          question: t("faq.accounts.guestOrder.question"),
          answer: t("faq.accounts.guestOrder.answer"),
        },
        { question: t("faq.accounts.update.question"), answer: t("faq.accounts.update.answer") },
      ],
    },
    {
      id: "refunds",
      icon: <RefreshCw className="h-5 w-5" />,
      title: t("faq.refunds.title"),
      items: [
        { question: t("faq.refunds.when.question"), answer: t("faq.refunds.when.answer") },
        { question: t("faq.refunds.after.question"), answer: t("faq.refunds.after.answer") },
      ],
    },
    {
      id: "vendors",
      icon: <Store className="h-5 w-5" />,
      title: t("faq.vendors.title"),
      items: [
        { question: t("faq.vendors.sell.question"), answer: t("faq.vendors.sell.answer") },
      ],
    },
  ];

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
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:bg-neutral-100"
            >
              {t("cta.contact")}
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex min-h-11 items-center justify-center border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("cta.howItWorks")}
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full border-b border-black/5 bg-white/70">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-6">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">{t("topics.title")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("topics.subtitle")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <a
                key={topic.id}
                href={`#${topic.id}`}
                className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-[#0F3460]/30 hover:text-[#0F3460]"
              >
                <span className="text-[#0F3460]">{topic.icon}</span>
                {topic.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full">
        <div className="mx-auto w-full max-w-[1540px] space-y-6 px-4 py-8 sm:px-6 sm:py-10">
          {topics.map((topic) => (
            <div key={topic.id} id={topic.id} className="scroll-mt-24">
              <div className="mb-3 flex items-center gap-2 text-[#0F3460]">
                {topic.icon}
                <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">{topic.title}</h2>
              </div>
              <div className="divide-y divide-neutral-200 border-y border-neutral-200 bg-white">
                {topic.items.map((item) => (
                  <FaqItem key={item.question} question={item.question} answer={item.answer} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full border-t border-black/5 bg-white">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">{t("links.title")}</h2>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <Link
              href="/refunds"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <RefreshCw className="h-4 w-4" />
              {t("links.refunds")}
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <Package className="h-4 w-4" />
              {t("links.howItWorks")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <HelpCircle className="h-4 w-4" />
              {t("links.contact")}
            </Link>
            <Link
              href="/vendor/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
            >
              <Store className="h-4 w-4" />
              {t("links.sell")}
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-[1540px] bg-[#0F3460] px-5 py-7 text-white sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold sm:text-xl">{t("contact.title")}</h3>
              <p className="mt-1 text-sm text-white/80">{t("contact.subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${SITE_CONTACT.email}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:bg-neutral-100"
              >
                <Mail className="h-4 w-4" />
                {t("contact.email")}
              </a>
              <a
                href={`tel:${SITE_CONTACT.phoneTel}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Phone className="h-4 w-4" />
                {t("contact.call")}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group px-4 py-4 open:bg-neutral-50/80 sm:px-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600">{answer}</p>
    </details>
  );
}
