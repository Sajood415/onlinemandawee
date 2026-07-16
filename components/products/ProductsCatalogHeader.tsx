"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

type ProductsCatalogHeaderProps = {
  title: string;
  subtitle?: string;
  isRtl: boolean;
  categoryLabel?: string | null;
};

/** Naheed-style light catalog chrome — breadcrumb + title, no navy hero strip. */
export function ProductsCatalogHeader({
  title,
  subtitle,
  isRtl,
  categoryLabel,
}: ProductsCatalogHeaderProps) {
  const t = useTranslations("ProductsPages.catalog");

  return (
    <div className="mb-5">
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-neutral-400">
        <Link href="/" className="transition hover:text-[#0F3460] hover:underline">
          {t("home")}
        </Link>
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
        <Link href="/products" className="transition hover:text-[#0F3460] hover:underline">
          {t("title")}
        </Link>
        {categoryLabel ? (
          <>
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="text-neutral-700">{categoryLabel}</span>
          </>
        ) : null}
      </nav>
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-neutral-500">{subtitle}</p> : null}
    </div>
  );
}
