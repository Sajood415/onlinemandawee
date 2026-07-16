"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { HEADER_LOGO_SRC } from "@/components/layout/header/header-copy";

export const AUTH_INPUT_CLASS =
  "w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0F3460]";

export const AUTH_BUTTON_CLASS =
  "inline-flex w-full min-h-11 items-center justify-center bg-[#0F3460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-50";

export const AUTH_SECONDARY_BUTTON_CLASS =
  "inline-flex w-full min-h-11 items-center justify-center border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-[#0F3460]/30 hover:text-[#0F3460] disabled:opacity-50";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const t = useTranslations("Auth.shell");
  const locale = useLocale();
  const isRtl = locale !== "en";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="relative flex min-h-dvh w-full flex-col bg-[#eef1f6]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-br from-[#163f73] via-[#0F3460] to-[#0a2748]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-white/75">
          <Link href="/" className="transition hover:text-white hover:underline">
            {t("home")}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 opacity-70 ${isRtl ? "rotate-180" : ""}`} />
          <span className="font-medium text-white">{title}</span>
        </nav>

        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src={HEADER_LOGO_SRC}
              alt="MandawEE"
              width={140}
              height={36}
              className="h-8 w-auto brightness-0 invert"
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:text-white"
          >
            {t("backToStore")}
          </Link>
        </div>

        <div className="border border-neutral-200/80 bg-white px-5 py-7 shadow-sm sm:px-7 sm:py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F3460]/70">
            MandawEE
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">{subtitle}</p>
          ) : null}

          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 border-t border-neutral-100 pt-5">{footer}</div> : null}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          <Link href="/" className="font-semibold text-[#0F3460] underline-offset-4 hover:underline">
            {t("continueShopping")}
          </Link>
        </p>
      </div>
    </div>
  );
}
