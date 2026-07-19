"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";

import { getGuestOrderTrackingCopy } from "@/components/orders/guest-order-tracking-copy";
import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type GuestOrderTrackingShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function GuestOrderTrackingShell({
  title,
  subtitle,
  children,
}: GuestOrderTrackingShellProps) {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getGuestOrderTrackingCopy(locale);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <section className="relative w-full min-w-0 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/vendor/seller-map.jpg"
            alt={copy.heroImageAlt}
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

        <div className="relative mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <nav
            aria-label={copy.breadcrumb}
            className="mb-5 flex flex-wrap items-center gap-2 text-sm text-white/70"
          >
            <Link href="/" className="transition hover:text-white hover:underline">
              {copy.home}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{copy.trackOrder}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Mandawee · {copy.eyebrow}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
      </section>

      <section className="relative w-full min-w-0 -mt-1">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </section>
    </div>
  );
}
