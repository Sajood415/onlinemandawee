"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BadgeCheck,
  ChevronDown,
  FileCheck2,
  Handshake,
  LayoutDashboard,
  Megaphone,
  PackageCheck,
  WalletCards,
} from "lucide-react";

export function VendorRegisterShowcase() {
  const t = useTranslations("VendorPages.register.landing");
  const processSteps = [
    {
      title: t("process.steps.account.title"),
      description: t("process.steps.account.description"),
    },
    {
      title: t("process.steps.store.title"),
      description: t("process.steps.store.description"),
    },
    {
      title: t("process.steps.kyc.title"),
      description: t("process.steps.kyc.description"),
    },
    {
      title: t("process.steps.address.title"),
      description: t("process.steps.address.description"),
    },
    {
      title: t("process.steps.payout.title"),
      description: t("process.steps.payout.description"),
    },
    {
      title: t("process.steps.agreements.title"),
      description: t("process.steps.agreements.description"),
    },
  ];

  return (
    <div className="w-full min-w-0 bg-[#f2f3f7]">
      <section className="w-full min-w-0 border-b border-black/5">
        <div className="mx-auto w-full max-w-[1540px] px-0">
          <div className="grid min-h-[380px] grid-cols-1 lg:min-h-[470px] lg:grid-cols-2">
            <div className="relative overflow-hidden bg-linear-to-br from-[#163f73] via-[#0F3460] to-[#0a2748] text-white">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.18),transparent_42%)]"
              />
              <div className="relative flex h-full flex-col justify-center px-4 py-10 sm:px-7 lg:px-10">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
                  <Handshake className="h-4 w-4" aria-hidden />
                  {t("eyebrow")}
                </span>
                <h1 className="mt-4 max-w-xl text-2xl font-bold leading-tight sm:text-3xl lg:text-[2.25rem]">
                  {t("title")}
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
                  {t("subtitle")}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/vendor/register/apply"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] shadow-sm transition hover:bg-neutral-100"
                  >
                    {t("startButton")}
                  </Link>
                  <a
                    href="#seller-process"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {t("processButton")}
                  </a>
                </div>
              </div>
            </div>
            <div className="relative min-h-[250px] lg:min-h-[470px]">
              <Image
                src="/vendor/seller-hero.jpg"
                alt="Seller growth"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section id="seller-process" className="w-full min-w-0 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1540px] px-0">
          <div className="grid grid-cols-1 overflow-hidden border-y border-black/5 bg-white lg:grid-cols-2">
            <div className="relative min-h-[240px] lg:min-h-[420px]">
              <Image
                src="/vendor/seller-process.jpg"
                alt="Seller onboarding process"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="flex h-full flex-col justify-center px-4 py-5 sm:px-7 lg:px-10 lg:py-7">
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("process.title")}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
                {t("process.subtitle")}
              </p>
              <div className="mt-5 space-y-2.5">
                {processSteps.map((step, index) => (
                  <ProcessRow
                    key={step.title}
                    index={index + 1}
                    label={step.title}
                    description={step.description}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 py-2 sm:py-4">
        <div className="mx-auto w-full max-w-[1540px] px-2 sm:px-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<LayoutDashboard className="h-5 w-5" />}
              title={t("features.dashboard.title")}
              description={t("features.dashboard.description")}
            />
            <FeatureCard
              icon={<Megaphone className="h-5 w-5" />}
              title={t("features.promotions.title")}
              description={t("features.promotions.description")}
            />
            <FeatureCard
              icon={<WalletCards className="h-5 w-5" />}
              title={t("features.payouts.title")}
              description={t("features.payouts.description")}
            />
            <FeatureCard
              icon={<PackageCheck className="h-5 w-5" />}
              title={t("features.orders.title")}
              description={t("features.orders.description")}
            />
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1540px] px-0">
          <div className="grid grid-cols-1 overflow-hidden border-y border-black/5 bg-white lg:grid-cols-2">
            <div className="relative min-h-[240px] lg:order-1 lg:min-h-[380px]">
              <Image
                src="/vendor/seller-map.jpg"
                alt="Seller delivery coverage"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="flex h-full flex-col justify-center bg-[#0F3460] px-4 py-6 text-white sm:px-7 lg:px-10 lg:py-8">
              <h3 className="text-xl font-bold sm:text-2xl">{t("requirements.title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">
                {t("requirements.subtitle")}
              </p>
              <ul className="mt-5 space-y-2">
                <ListItem onDark text={t("requirements.items.identity")} />
                <ListItem onDark text={t("requirements.items.business")} />
                <ListItem onDark text={t("requirements.items.address")} />
                <ListItem onDark text={t("requirements.items.bank")} />
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 py-2 sm:py-4">
        <div className="mx-auto w-full max-w-[1540px] px-2 sm:px-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-base font-bold text-neutral-900 sm:text-lg">{t("trust.title")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{t("trust.subtitle")}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <TrustRow icon={<BadgeCheck className="h-4 w-4" />} text={t("trust.items.review")} />
              <TrustRow icon={<FileCheck2 className="h-4 w-4" />} text={t("trust.items.policies")} />
              <TrustRow icon={<Handshake className="h-4 w-4" />} text={t("trust.items.support")} />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 py-2 sm:py-4">
        <div className="mx-auto w-full max-w-[1540px] px-2 sm:px-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-base font-bold text-neutral-900 sm:text-lg">{t("faq.title")}</h3>
            <div className="mt-4 space-y-2">
              <FaqItem question={t("faq.items.approval.question")} answer={t("faq.items.approval.answer")} />
              <FaqItem question={t("faq.items.cost.question")} answer={t("faq.items.cost.answer")} />
              <FaqItem question={t("faq.items.edit.question")} answer={t("faq.items.edit.answer")} />
              <FaqItem question={t("faq.items.publish.question")} answer={t("faq.items.publish.answer")} />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 px-2 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto w-full max-w-[1540px]">
          <div className="rounded-2xl bg-[#0F3460] px-4 py-5 text-white sm:px-6 sm:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold sm:text-xl">{t("finalCta.title")}</h3>
                <p className="mt-1 text-sm text-white/85">{t("finalCta.subtitle")}</p>
              </div>
              <Link
                href="/vendor/register/apply"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:bg-neutral-100"
              >
                {t("finalCta.button")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3460]/10 text-[#0F3460]">
        {icon}
      </div>
      <h2 className="mt-3 text-sm font-bold text-neutral-900 sm:text-base">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-neutral-600">{description}</p>
    </article>
  );
}

function ProcessRow({
  index,
  label,
  description,
}: {
  index: number;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex rounded-full bg-[#0F3460]/10 px-2 py-0.5 text-[11px] font-bold text-[#0F3460]">
          Step {index}
        </span>
        <p className="text-sm font-semibold text-neutral-800">{label}</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-600 sm:text-sm">{description}</p>
    </div>
  );
}

function ListItem({ text, onDark = false }: { text: string; onDark?: boolean }) {
  return (
    <li
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        onDark ? "bg-white/10 text-white/95" : "bg-[#fafafa] text-neutral-700"
      }`}
    >
      <span
        className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
          onDark ? "bg-white" : "bg-[#0F3460]"
        }`}
        aria-hidden
      />
      <span>{text}</span>
    </li>
  );
}

function TrustRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-[#fafafa] px-3 py-2 text-sm text-neutral-700">
      <span className="mt-0.5 text-[#0F3460]">{icon}</span>
      <span>{text}</span>
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
