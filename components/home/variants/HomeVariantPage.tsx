"use client";

import { useLocale } from "next-intl";
import productData from "@/data/product.json";
import { VariantCarousel } from "./VariantCarousel";
import { MarketplaceSections } from "../shared/MarketplaceSections";

type Variant = "v1" | "v2" | "v3";
type Locale = "en" | "ps" | "fa-AF";

type ProductRow = {
  id: string;
  image: string;
  priceDisplay: string;
  vendor: string;
  name: { en: string; ps: string; "fa-AF": string };
};

export function HomeVariantPage({ variant }: { variant: Variant }) {
  const locale = useLocale();
  const safeLocale: Locale = locale === "ps" || locale === "fa-AF" ? locale : "en";
  const products = productData.featuredProducts as ProductRow[];

  const pageTone =
    variant === "v2"
      ? "rgba(2, 55, 136, 0.04)"
      : variant === "v3"
        ? "rgba(23, 23, 23, 0.04)"
        : "rgba(220, 53, 69, 0.04)";

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageTone }}>
      <VariantCarousel variant={variant} />
      <MarketplaceSections locale={safeLocale} products={products} variant={variant} />
    </div>
  );
}
