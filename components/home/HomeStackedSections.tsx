"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { HomeProductRail } from "./HomeProductRail";

const HOME_STACKED_SECTIONS = [
  {
    id: "quality-grocery",
    href: "/category/grocery",
    titleKey: "stackedSections.qualityGrocery",
    productIds: [
      "beef-meat-1kg",
      "hayat-cooking-oil-16l",
      "alkozai-sunflower-oil-5l",
      "fish-meat-1kg",
      "mak-pasta-fusilli",
      "basmati-rice-5kg",
    ],
  },
  {
    id: "snacks-confectionery",
    href: "/category/snacks",
    titleKey: "stackedSections.snacksConfectionery",
    productIds: [
      "afghani-cake-1kg",
      "artisan-dark-chocolate-3bar",
      "black-pepper-1kg",
      "momak-flour-50kg",
      "fresh-fruit-mix-box",
      "organic-veg-bundle",
    ],
  },
  {
    id: "sip-refreshment",
    href: "/category/beverages",
    titleKey: "stackedSections.sipRefreshment",
    productIds: [
      "minute-maid-juice-1l",
      "mana-cola-250ml",
      "red-bull-250ml",
      "spring-water-24pk",
      "greek-yogurt-1kg",
      "watani-chicken-eggs-30",
    ],
  },
  {
    id: "baby-world",
    href: "/category/baby-care",
    titleKey: "stackedSections.babyWorld",
    productIds: [
      "baby-pino-soap-75g",
      "johnsons-baby-soap-125g",
      "perfect-tissue-400",
      "kitchen-paper-towels-6rl",
      "fresh-fruit-mix-box",
      "organic-veg-bundle",
    ],
  },
] as const;

export function HomeStackedSections() {
  const t = useTranslations("Homepage.store");
  const [sharedVendorProducts, setSharedVendorProducts] = useState<
    PublicCatalogProduct[] | undefined
  >(undefined);

  useEffect(() => {
    void fetchPublicCatalogProducts()
      .then(setSharedVendorProducts)
      .catch(() => setSharedVendorProducts([]));
  }, []);

  return (
    <div className="w-full min-w-0 bg-[#F5F5F5]">
      {HOME_STACKED_SECTIONS.map((section) => (
        <div key={section.id} className="w-full min-w-0">
          <div className="home-content-padding mx-auto w-full min-w-0 max-w-[1600px] py-4 sm:py-6 lg:py-8">
            <HomeProductRail
              title={t(section.titleKey)}
              viewAllHref={section.href}
              productIds={section.productIds}
              sharedVendorProducts={sharedVendorProducts}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
