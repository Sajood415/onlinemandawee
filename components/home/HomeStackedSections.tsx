"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import productData from "@/data/product.json";
import { HomeProductRail } from "./HomeProductRail";

export function HomeStackedSections() {
  const { sections } = productData.homeStackedSections;

  return (
    <div className="w-full min-w-0 bg-white">
      {sections.map((section) => (
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
            <HomeProductRail productIds={section.productIds} showTitle={false} />
          </div>
        </div>
      ))}
    </div>
  );
}
