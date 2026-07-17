"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Mail, Phone } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { SITE_CONTACT } from "@/lib/content/contact-info";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

export type LegalPageKey = "privacy" | "terms" | "refunds" | "vendorTerms";

type LegalSubsection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: LegalSubsection[];
};

type LegalRelatedLink = {
  href: string;
  label: string;
};

type LegalPageShowcaseProps = {
  pageKey: LegalPageKey;
};

function replaceContactTokens(text: string) {
  return text
    .replaceAll("{email}", SITE_CONTACT.email)
    .replaceAll("{phone}", SITE_CONTACT.phoneDisplay);
}

function SectionBody({ section }: { section: LegalSection }) {
  return (
    <div className="min-w-0 space-y-4">
      {section.paragraphs?.map((paragraph) => (
        <p
          key={paragraph}
          className="break-words text-sm leading-relaxed text-neutral-600 sm:text-[15px]"
        >
          {replaceContactTokens(paragraph)}
        </p>
      ))}

      {section.bullets && section.bullets.length > 0 ? (
        <ul className="list-disc space-y-2 break-words ps-5 text-sm leading-relaxed text-neutral-600 sm:text-[15px]">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{replaceContactTokens(bullet)}</li>
          ))}
        </ul>
      ) : null}

      {section.subsections?.map((subsection) => (
        <div
          key={subsection.title}
          className="min-w-0 space-y-2 border-s-2 border-[#0F3460]/25 ps-4"
        >
          <h3 className="break-words text-sm font-semibold text-neutral-900 sm:text-base">
            {subsection.title}
          </h3>
          {subsection.paragraphs?.map((paragraph) => (
            <p
              key={paragraph}
              className="break-words text-sm leading-relaxed text-neutral-600 sm:text-[15px]"
            >
              {replaceContactTokens(paragraph)}
            </p>
          ))}
          {subsection.bullets && subsection.bullets.length > 0 ? (
            <ul className="list-disc space-y-2 break-words ps-5 text-sm leading-relaxed text-neutral-600 sm:text-[15px]">
              {subsection.bullets.map((bullet) => (
                <li key={bullet}>{replaceContactTokens(bullet)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function LegalPageShowcase({ pageKey }: LegalPageShowcaseProps) {
  const t = useTranslations(`LegalPages.${pageKey}`);
  const tShared = useTranslations("LegalPages.shared");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";

  const sections = t.raw("sections") as LegalSection[];
  const relatedLinks = t.raw("relatedLinks") as LegalRelatedLink[];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <section className="relative overflow-hidden bg-linear-to-br from-[#163f73] via-[#0F3460] to-[#0a2748] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.16),transparent_42%)]"
        />
        <div className="relative mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {tShared("home")}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 opacity-70 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{t("title")}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            MandawEE · {t("eyebrow")}
          </p>
          <h1 className="mt-3 max-w-3xl break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl break-words text-sm leading-relaxed text-white/80 sm:text-base">
            {t("subtitle")}
          </p>
          <p className="mt-4 text-xs text-white/55">
            {tShared("lastUpdated")}: {SITE_CONTACT.lastUpdated}
          </p>
        </div>
      </section>

      <div className="mx-auto w-full min-w-0 max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="min-w-0 border border-neutral-200/80 bg-white px-4 py-4 sm:px-5">
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                {tShared("onThisPage")}
              </h2>
              <nav className="flex min-w-0 flex-wrap gap-2 lg:block lg:space-y-1.5">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="inline-flex max-w-full break-words border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-600 transition hover:border-[#0F3460]/30 hover:text-[#0F3460] lg:block lg:border-0 lg:bg-transparent lg:px-0 lg:py-0.5"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 max-w-full border border-neutral-200/80 bg-white">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className={`min-w-0 scroll-mt-24 px-4 py-6 sm:px-6 sm:py-7 ${
                  index < sections.length - 1 ? "border-b border-neutral-100" : ""
                }`}
              >
                <h2 className="mb-4 break-words text-lg font-bold text-neutral-900 sm:text-xl">
                  {section.title}
                </h2>
                <SectionBody section={section} />
              </section>
            ))}
          </div>
        </div>

        {relatedLinks.length > 0 ? (
          <section className="mt-8 border border-neutral-200/80 bg-white px-4 py-6 sm:px-6">
            <h2 className="text-base font-bold text-neutral-900 sm:text-lg">{tShared("relatedLinks")}</h2>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as "/terms" | "/privacy" | "/refunds" | "/contact" | "/help" | "/vendor/register"}
                  className="text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 bg-[#0F3460] px-5 py-7 text-white sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold sm:text-xl">{tShared("contactTitle")}</h3>
              <p className="mt-1 text-sm text-white/80">{tShared("contactSubtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${SITE_CONTACT.email}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:bg-neutral-100"
              >
                <Mail className="h-4 w-4" />
                {tShared("emailLabel")}
              </a>
              <a
                href={`tel:${SITE_CONTACT.phoneTel}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Phone className="h-4 w-4" />
                {tShared("callLabel")}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
