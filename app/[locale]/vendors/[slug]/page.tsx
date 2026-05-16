"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  MapPin,
  ShoppingCart,
  Star,
  Store,
  Truck,
} from "lucide-react";

import productData from "@/data/product.json";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { toast } from "@/lib/utils/toast";
import { useCart } from "@/store/cart-context";

const allProducts = productData.featuredProducts;
const vendorProfiles = productData.vendorProfiles ?? [];

export default function VendorStorePage() {
  const params = useParams();
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const slug = params.slug as string;
  const { addItem } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);

  const vendor = useMemo(
    () => vendorProfiles.find((item) => item.slug === slug) ?? null,
    [slug]
  );

  const vendorProducts = useMemo(
    () => allProducts.filter((product) => product.vendorSlug === slug),
    [slug]
  );

  if (!vendor) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Store className="h-7 w-7 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === "en"
              ? "Vendor not found"
              : locale === "ps"
                ? "پلورونکی ونه موندل شو"
                : "فروشنده پیدا نشد"}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {locale === "en"
              ? "This vendor page is not available."
              : locale === "ps"
                ? "د پلورونکي پاڼه شتون نه لري."
                : "صفحه فروشنده در دسترس نیست."}
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
          >
            {locale === "en"
              ? "Back to products"
              : locale === "ps"
                ? "بېرته محصولاتو ته"
                : "بازگشت به محصولات"}
          </Link>
        </div>
      </div>
    );
  }

  const onAddToCart = async (productId: string) => {
    setAddingId(productId);
    try {
      await addItem(productId, 1);
      toast.success(
        locale === "en"
          ? "Added to cart!"
          : locale === "ps"
            ? "کارټ ته اضافه شو!"
            : "به سبد اضافه شد!"
      );
    } catch {
      toast.error(
        locale === "en"
          ? "Failed to add to cart"
          : locale === "ps"
            ? "کارټ ته اضافه کول ناکام شول"
            : "افزودن به سبد ناموفق بود"
      );
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-sm">
          <Link href="/" className="text-gray-500 hover:text-primary hover:underline">
            {locale === "en" ? "Home" : locale === "ps" ? "کور" : "خانه"}
          </Link>
          <ChevronRight className={`h-4 w-4 text-gray-400 ${isRtl ? "rotate-180" : ""}`} />
          <Link href="/products" className="text-gray-500 hover:text-primary hover:underline">
            {locale === "en"
              ? "Products"
              : locale === "ps"
                ? "محصولات"
                : "محصولات"}
          </Link>
          <ChevronRight className={`h-4 w-4 text-gray-400 ${isRtl ? "rotate-180" : ""}`} />
          <span className="truncate font-medium text-gray-900">{vendor.name}</span>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="relative h-44 sm:h-56 lg:h-64">
            <Image
              src={vendor.coverImage}
              alt={vendor.name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#0f3460]/80 via-[#0f3460]/40 to-transparent" />
          </div>

          <div className="px-4 pb-6 pt-4 sm:px-6 sm:pt-5 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="relative -mt-10 h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:-mt-12 sm:h-24 sm:w-24">
                  <Image src={vendor.logo} alt={vendor.name} fill className="object-cover" />
                </div>
                <div className="pb-1">
                  <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{vendor.name}</h1>
                  <p className="text-sm text-gray-600">{vendor.tagline[locale]}</p>
                </div>
              </div>

              <div className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary sm:text-sm">
                {vendorProducts.length}{" "}
                {locale === "en"
                  ? "Products"
                  : locale === "ps"
                    ? "محصولات"
                    : "محصول"}
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-gray-700 sm:text-base">
              {vendor.description[locale]}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-700">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{vendor.rating}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-700">
                <Truck className="h-4 w-4 text-primary" />
                <span>{vendor.fulfillmentRate} fulfillment</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-700">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{vendor.location[locale]}</span>
              </div>
            </div>

            <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                {locale === "en"
                  ? `Joined ${vendor.joinedYear}`
                  : locale === "ps"
                    ? `په ${vendor.joinedYear} کې یوځای شوی`
                    : `پیوسته در ${vendor.joinedYear}`}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {locale === "en"
              ? "Products from this vendor"
              : locale === "ps"
                ? "د دې پلورونکي محصولات"
                : "محصولات این فروشنده"}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {vendorProducts.map((product) => (
            <div
              key={product.id}
              className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-3"
            >
              <Link href={`/products/${product.id}`} className="flex flex-1 flex-col">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50">
                  <Image
                    src={product.image}
                    alt={product.name[locale]}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-3 min-h-11 line-clamp-2 text-sm font-medium text-gray-900 transition-colors group-hover:text-primary">
                  {product.name[locale]}
                </h3>
              </Link>
              <div className="mt-2 mb-4 flex items-center text-xs text-gray-500">
                <span className="font-medium">{product.priceDisplay}</span>
              </div>
              <button
                type="button"
                onClick={() => onAddToCart(product.id)}
                disabled={addingId === product.id}
                className="mt-auto pt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {addingId === product.id ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {locale === "en"
                  ? "Add to cart"
                  : locale === "ps"
                    ? "کارټ ته اضافه کړئ"
                    : "افزودن به سبد"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
