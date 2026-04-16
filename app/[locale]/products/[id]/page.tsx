"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Star,
  ShoppingCart,
  Heart,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Store,
  CheckCircle,
} from "lucide-react";
import productData from "@/data/product.json";

// Import data from JSON file
const allProducts = productData.featuredProducts;

export default function ProductDetailPage() {
  const params = useParams();
  const locale = useLocale() as "en" | "ps" | "fa-AF";
  const productId = params.id as string;

  const product = allProducts.find((p) => p.id === productId);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShoppingCart className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {locale === "en"
              ? "Product Not Found"
              : locale === "ps"
                ? "محصول ونه موندل شو"
                : "محصول یافت نشد"}
          </h1>
          <Link
            href="/products"
            className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {locale === "en"
              ? "Back to Products"
              : locale === "ps"
                ? "بیرته محصولاتو ته"
                : "بازگشت به محصولات"}
          </Link>
        </div>
      </div>
    );
  }

  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-gray-500 hover:text-primary hover:underline"
            >
              {locale === "en" ? "Home" : locale === "ps" ? "کور" : "خانه"}
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link
              href="/products"
              className="text-gray-500 hover:text-primary hover:underline"
            >
              {locale === "en"
                ? "Products"
                : locale === "ps"
                  ? "محصولات"
                  : "محصولات"}
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900 font-medium truncate max-w-50">
              {product.name[locale]}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Product Section - Walmart Style */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Left: Images - 7 columns */}
          <div className="lg:col-span-7">
            <div className="flex gap-4">
              {/* Thumbnails - Vertical on left with scroll for many images */}
              {product.images.length > 1 && (
                <div
                  className="hidden sm:flex flex-col gap-3 w-20 shrink-0 max-h-100px overflow-y-auto pr-1"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#d1d5db transparent",
                  }}
                >
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                        selectedImage === idx
                          ? "border-primary ring-1 ring-primary"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Image src={img} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Image */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative flex-1 aspect-square bg-gray-50 rounded-lg overflow-hidden"
              >
                <Image
                  src={product.images[selectedImage]}
                  alt={product.name[locale]}
                  fill
                  className="object-cover"
                  priority
                />
                {product.badge && (
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        product.badge.en === "Best Seller"
                          ? "bg-primary text-white"
                          : "bg-green-100 text-green-700 border border-green-200"
                      }`}
                    >
                      {product.badge[locale]}
                    </span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Mobile Thumbnails - Horizontal scroll */}
            {product.images.length > 1 && (
              <div
                className="flex sm:hidden gap-2 mt-4 overflow-x-auto pb-2 px-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${
                      selectedImage === idx
                        ? "border-primary ring-1 ring-primary"
                        : "border-gray-200"
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info - 5 columns */}
          <div className="lg:col-span-5">
            {/* Vendor & Title */}
            <Link
              href={`/products?vendor=${encodeURIComponent(product.vendor)}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary hover:underline mb-2"
            >
              <Store className="h-4 w-4" />
              <span>{product.vendor}</span>
              <ChevronRight className="h-3 w-3" />
            </Link>

            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 leading-tight">
              {product.name[locale]}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {product.rating}
              </span>
              <span className="text-sm text-gray-500 hover:text-primary hover:underline cursor-pointer">
                ({product.reviews}{" "}
                {locale === "en"
                  ? "reviews"
                  : locale === "ps"
                    ? "بیاکتنې"
                    : "نقد"}
                )
              </span>
              <span className="text-sm text-green-600 font-medium ml-2">
                {locale === "en"
                  ? "In stock"
                  : locale === "ps"
                    ? "په ذخیره کې"
                    : "موجود"}
              </span>
            </div>

            {/* Price - Walmart Blue */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  {product.priceDisplay}
                </span>
                {product.price > 50 && (
                  <span className="text-sm text-gray-500">
                    {locale === "en" ? "Was" : locale === "ps" ? "و" : "بود"}{" "}
                    <span className="line-through">
                      ${(product.price * 1.15).toFixed(2)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Delivery Options - Walmart Style */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <Truck className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {product.delivery}
                  </p>
                  <p className="text-sm text-gray-500">
                    {locale === "en"
                      ? "Delivery to your location"
                      : locale === "ps"
                        ? "ستاسو ځای ته تحویل"
                        : "تحویل به موقعیت شما"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-700 mb-2 block">
                {locale === "en"
                  ? "Quantity"
                  : locale === "ps"
                    ? "مقدار"
                    : "مقدار"}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-full bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-gray-100 transition-colors rounded-l-full text-lg font-medium"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-gray-100 transition-colors rounded-r-full text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons - Walmart Style */}
            <div className="flex gap-3 mb-6">
              <button className="flex-1 py-3.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {locale === "en"
                  ? "Add to cart"
                  : locale === "ps"
                    ? "کارټ ته اضافه کړئ"
                    : "افزودن به سبد"}
              </button>
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`px-4 rounded-full border-2 transition-all ${
                  isWishlisted
                    ? "bg-white border-red-400 text-red-500"
                    : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                <Heart
                  className={`h-6 w-6 ${isWishlisted ? "fill-current" : ""}`}
                />
              </button>
            </div>

            {/* About this item */}
            <div className="pt-6 mt-6 bg-gray-50 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-4">
                {locale === "en"
                  ? "About this item"
                  : locale === "ps"
                    ? "د دې توکي په اړه"
                    : "درباره این کالا"}
              </h3>
              <ul className="space-y-2">
                {product.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-sm text-gray-700"
                  >
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                {product.description[locale]}
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-gray-50 rounded-xl p-6 mb-12">
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <ShieldCheck className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {locale === "en"
                    ? "Secure Payment"
                    : locale === "ps"
                      ? "امنه پرداخت"
                      : "پرداخت امن"}
                </p>
                <p className="text-xs text-gray-500">
                  {locale === "en"
                    ? "100% secure checkout"
                    : locale === "ps"
                      ? "100ټکی امنه پیسې ورکول"
                      : "پرداخت 100٪ امن"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <RotateCcw className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {locale === "en"
                    ? "Easy Returns"
                    : locale === "ps"
                      ? "اسانه بیرته"
                      : "بازگشت آسان"}
                </p>
                <p className="text-xs text-gray-500">
                  {locale === "en"
                    ? "30-day return policy"
                    : locale === "ps"
                      ? "30 ورځنی بیرته تګ"
                      : "بازگشت 30 روزه"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Truck className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {locale === "en"
                    ? "Fast Delivery"
                    : locale === "ps"
                      ? "ژر تحویل"
                      : "تحویل سریع"}
                </p>
                <p className="text-xs text-gray-500">
                  {locale === "en"
                    ? "Quick & reliable shipping"
                    : locale === "ps"
                      ? "ژر او باوري لېږد"
                      : "تحویل سریع و قابل اعتماد"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications Section */}
        <div className="bg-gray-50 rounded-xl p-6 mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-5">
            {locale === "en"
              ? "Product Features"
              : locale === "ps"
                ? "د محصول ځانګړتیاوې"
                : "ویژگی‌های محصول"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {product.features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {locale === "en"
                ? "People also viewed"
                : locale === "ps"
                  ? "خلک هم وکتل"
                  : "مردم همچنین مشاهده کردند"}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={`/products/${related.id}`}
                  className="group block"
                >
                  <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
                    <Image
                      src={related.image}
                      alt={related.name[locale]}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{related.vendor}</p>
                  <h3 className="text-sm text-gray-900 mb-2 line-clamp-2 group-hover:text-primary hover:underline">
                    {related.name[locale]}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      {related.priceDisplay}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium text-gray-700">
                        {related.rating}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
