"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Banknote, ChevronRight, ClipboardCheck, PackageCheck, Send } from "lucide-react";

import { getHawalaCopy } from "@/components/hawala/copy";
import { HawalaTransferForm } from "@/components/hawala/HawalaTransferForm";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

export default function HawalaPage() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getHawalaCopy(locale);

  const steps = [
    { icon: ClipboardCheck, title: copy.step1Title, body: copy.step1Body },
    { icon: PackageCheck, title: copy.step2Title, body: copy.step2Body },
    { icon: Send, title: copy.step3Title, body: copy.step3Body },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <section className="border-b border-[#0f3460]/10 bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {copy.home}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{copy.title}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
              <Banknote className="h-3.5 w-3.5" />
              {copy.badge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
              {copy.subtitle}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0f3460]/10 text-[#0f3460]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
              <p className="mt-1 text-sm text-neutral-600">{body}</p>
            </div>
          ))}
        </section>

        <HawalaTransferForm locale={locale} />
      </div>
    </div>
  );
}
