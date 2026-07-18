"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import {
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Mail,
  Phone,
} from "lucide-react";

import { getContentPageCopy } from "@/components/content/content-page-copy";
import { SITE_CONTACT } from "@/lib/content/contact-info";
import type { ContentPageDefinition, ContentSection } from "@/lib/content/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type ContentPageViewProps = {
  page: ContentPageDefinition;
};

function SectionBody({ section }: { section: ContentSection }) {
  return (
    <div className="space-y-4">
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          {paragraph}
        </p>
      ))}

      {section.bullets && section.bullets.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      {section.subsections?.map((subsection) => (
        <div key={subsection.title} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{subsection.title}</h3>
          {subsection.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              {paragraph}
            </p>
          ))}
          {subsection.bullets && subsection.bullets.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              {subsection.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ContentPageView({ page }: ContentPageViewProps) {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getContentPageCopy(locale);
  const showToc = page.showTableOfContents !== false && page.sections.length > 3;
  const showLanguageNotice = page.showLanguageNotice !== false && locale !== "en";
  const isContactPage = page.slug === "contact";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <section className="border-b border-[#0f3460]/10 bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {copy.home}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{page.title}</span>
          </nav>

          <div className="max-w-3xl">
            {page.badge ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
                <FileText className="h-3.5 w-3.5" />
                {page.badge}
              </div>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">{page.subtitle}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-white/60">
              {copy.lastUpdated}: {SITE_CONTACT.lastUpdated}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {showLanguageNotice ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-5">
            <Globe className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{copy.languageNotice}</p>
          </div>
        ) : null}

        {isContactPage ? (
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <a
              href={`mailto:${SITE_CONTACT.email}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {copy.emailLabel}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-primary">
                <bdi>{SITE_CONTACT.email}</bdi>
              </p>
            </a>

            <a
              href={`tel:${SITE_CONTACT.phoneTel}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {copy.phoneLabel}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-primary">
                <bdi>{SITE_CONTACT.phoneDisplay}</bdi>
              </p>
            </a>
          </div>
        ) : null}

        <div className={`grid gap-8 ${showToc ? "lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]" : ""}`}>
          {showToc ? (
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-900">
                  {copy.onThisPage}
                </h2>
                <nav className="space-y-2">
                  {page.sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block text-sm text-slate-500 transition hover:text-primary"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          ) : null}

          <div className="space-y-5">
            {page.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7"
              >
                <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">{section.title}</h2>
                <SectionBody section={section} />
              </section>
            ))}
          </div>
        </div>

        {page.relatedLinks && page.relatedLinks.length > 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">{copy.relatedLinks}</h2>
            <div className="flex flex-wrap gap-3">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {page.showContactBlock !== false ? (
          <section className="mt-8 overflow-hidden rounded-2xl border border-[#0f3460]/10 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{copy.contactTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  {copy.contactSubtitle}
                </p>
                <div className="mt-4 flex items-start gap-2 text-sm text-slate-500">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>{copy.businessHoursText}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <a
                  href={`mailto:${SITE_CONTACT.email}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {copy.emailLabel}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      <bdi>{SITE_CONTACT.email}</bdi>
                    </p>
                  </div>
                </a>

                <a
                  href={`tel:${SITE_CONTACT.phoneTel}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {copy.phoneLabel}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      <bdi>{SITE_CONTACT.phoneDisplay}</bdi>
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
