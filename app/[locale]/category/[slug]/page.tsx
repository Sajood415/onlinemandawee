"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export default function CategorySlugPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const slug = params?.slug;
    if (!slug) return;
    const qp = new URLSearchParams({ category: slug });
    router.replace(`/${locale}/products?${qp.toString()}`);
  }, [locale, params?.slug, router]);

  return null;
}
