"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { HomeProductRail } from "./HomeProductRail";

export function HomeLatestProductsRail() {
  const t = useTranslations("Homepage.store");
  const [products, setProducts] = useState<PublicCatalogProduct[] | undefined>(undefined);

  useEffect(() => {
    void fetchPublicCatalogProducts()
      .then((items) => setProducts(items.slice(0, 12)))
      .catch(() => setProducts([]));
  }, []);

  return (
    <HomeProductRail
      title={t("latestProducts")}
      subtitle={t("latestProductsSubtitle")}
      viewAllHref="/products"
      sharedVendorProducts={products}
      shell
    />
  );
}
