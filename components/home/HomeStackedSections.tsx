"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { HomeProductRail } from "./HomeProductRail";

const HOME_STACKED_SECTIONS = [
  {
    id: "quality-grocery",
    banner:
      "https://onlinemandawee.com/cdn/shop/files/1_1.png?v=1766935713&width=2048",
    href: "/category/grocery",
    label: "Quality grocery products for a better living",
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
    banner:
      "https://onlinemandawee.com/cdn/shop/files/4_1.png?v=1766935712&width=2048",
    href: "/category/snacks",
    label: "Snacks and confectionery",
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
    banner:
      "https://onlinemandawee.com/cdn/shop/files/QUALITY-_1459-x-365-px_-_3_-2.png?v=1761944762&width=2048",
    href: "/category/beverages",
    label: "Sip refreshment and repeat",
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
    banner:
      "https://onlinemandawee.com/cdn/shop/files/1671107960.webp?v=1761342956&width=2048",
    href: "/category/baby-care",
    label: "Baby world essentials",
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
  const [sharedVendorProducts, setSharedVendorProducts] = useState<
    PublicCatalogProduct[] | undefined
  >(undefined);

  useEffect(() => {
    void fetchPublicCatalogProducts()
      .then(setSharedVendorProducts)
      .catch(() => setSharedVendorProducts([]));
  }, []);

  return (
    <div className="w-full min-w-0 bg-white">
      {HOME_STACKED_SECTIONS.map((section) => (
        <div key={section.id} className="w-full min-w-0 border-b border-slate-100">
          <Link
            href={section.href}
            className="relative block w-full min-w-0 overflow-hidden bg-slate-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary max-sm:min-h-0 sm:min-h-[120px] sm:h-[clamp(8.5rem,20vw,16.5rem)]"
          >
            <Image
              src={section.banner}
              alt={section.label}
              width={2048}
              height={820}
              className="h-auto w-full object-contain object-center sm:absolute sm:inset-0 sm:h-full sm:w-full sm:object-cover sm:object-center"
              sizes="100vw"
              priority={section.id === "quality-grocery"}
            />
          </Link>
          <div className="w-full min-w-0 px-3 py-6 sm:px-4 sm:py-10 lg:px-5">
            <HomeProductRail
              productIds={section.productIds}
              showTitle={false}
              sharedVendorProducts={sharedVendorProducts}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
