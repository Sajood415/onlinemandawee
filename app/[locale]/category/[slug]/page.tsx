"use client";

import { Suspense } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";

import { CategoryPageContent } from "@/components/categories/CategoryPageContent";
import { ProductsGridSkeleton } from "@/components/products/ProductsGridSkeleton";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

function CategoryPageInner() {
  const params = useParams<{ slug: string }>();
  const locale = useLocale() as SupportedLocale;
  const slug = params?.slug;

  if (!slug) return null;

  return (
    <CategoryPageContent
      slug={slug}
      locale={locale}
      isRtl={locale !== "en"}
    />
  );
}

export default function CategorySlugPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f6f8fc]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <ProductsGridSkeleton />
          </div>
        </div>
      }
    >
      <CategoryPageInner />
    </Suspense>
  );
}
