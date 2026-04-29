"use client";

import Image from "next/image";
import Link from "next/link";
import { Store, ShieldCheck, Truck, Tags, Star } from "lucide-react";
import { useTranslations } from "next-intl";

type Localized = { en: string; ps: string; "fa-AF": string };

type ProductRow = {
  id: string;
  image: string;
  priceDisplay: string;
  vendor: string;
  name: Localized;
};

type Props = {
  locale: "en" | "ps" | "fa-AF";
  products: ProductRow[];
  variant: "v1" | "v2" | "v3";
};

const categories = [
  "Breakfast",
  "Groceries",
  "Beverages",
  "Fruits",
  "Vegetables",
  "Baby Care",
  "Personal Care",
  "Snacks",
];

export function MarketplaceSections({ locale, products, variant }: Props) {
  const t = useTranslations("Homepage.HomeVariants.common");
  const trustItems = [t("trustOne"), t("trustTwo"), t("trustThree"), t("trustFour")];

  const cardTone =
    variant === "v2"
      ? "border-[var(--secondary)]/20"
      : variant === "v3"
        ? "border-[var(--primary)]/20"
        : "border-gray-200";
  const sectionTone =
    variant === "v2"
      ? "rgba(2, 55, 136, 0.06)"
      : variant === "v3"
        ? "rgba(23, 23, 23, 0.06)"
        : "rgba(220, 53, 69, 0.06)";
  const actionTone =
    variant === "v2" ? "bg-[var(--secondary)]" : variant === "v3" ? "bg-black" : "bg-[var(--primary)]";

  return (
    <div className="space-y-10 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl rounded-2xl border border-gray-200 p-4 sm:p-6" style={{ backgroundColor: sectionTone }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)]">{t("categoryTitle")}</h2>
          <Link href="/products" className="text-sm font-semibold text-[var(--secondary)]">
            {t("visitStore")}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((item) => (
            <div
              key={item}
              className={`rounded-xl border bg-[var(--background)] p-3 text-center text-sm font-medium text-[var(--foreground)] ${cardTone}`}
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">{t("topProducts")}</h2>
          <p className="text-sm text-gray-600">{t("topProductsDesc")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 8).map((product) => (
            <article key={product.id} className={`overflow-hidden rounded-2xl border ${cardTone}`} style={{ backgroundColor: sectionTone }}>
              <div className="relative h-44 w-full">
                <Image src={product.image} alt={product.name[locale]} fill className="object-cover" />
              </div>
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                  {product.name[locale]}
                </h3>
                <p className="text-xs text-gray-500">{product.vendor}</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--foreground)]">{product.priceDisplay}</span>
                  <button className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white ${actionTone}`}>
                    {t("buyNow")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl rounded-2xl border border-gray-200 p-5 sm:p-6" style={{ backgroundColor: sectionTone }}>
        <h2 className="mb-5 text-xl font-bold text-[var(--foreground)]">{t("featuredVendors")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {["Noor Premium Gifts", "Mandawee Market", "Fresh Farm Co"].map((vendor) => (
            <div key={vendor} className="rounded-xl border border-gray-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-[var(--secondary)]">
                <Store size={16} />
                <span className="text-xs font-semibold">{t("multiVendorStore")}</span>
              </div>
              <p className="font-semibold text-[var(--foreground)]">{vendor}</p>
              <div className="mt-2 flex items-center gap-1 text-[var(--yellow)]">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-3 rounded-2xl border border-gray-200 p-5 sm:grid-cols-2 lg:grid-cols-4" style={{ backgroundColor: sectionTone }}>
        {[ShieldCheck, Truck, Tags, Store].map((Icon, idx) => (
          <div key={idx} className="rounded-xl bg-[var(--background)] p-4">
            <Icon className="mb-2 text-[var(--secondary)]" size={18} />
            <p className="text-sm font-semibold text-[var(--foreground)]">{trustItems[idx]}</p>
            <p className="text-xs text-gray-500">{t("trustTitle")}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
