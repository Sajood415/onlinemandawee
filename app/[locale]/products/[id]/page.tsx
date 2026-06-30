"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "@/lib/utils/toast";
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
  Loader2,
  Tag,
} from "lucide-react";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";
import { resolveLocalizedRecord } from "@/lib/localization/product-content";
import {
  localizeDelivery,
  localizeVendor,
} from "@/lib/localization/product-vendor";
import { RelatedProducts } from "@/components/products/RelatedProducts";
import type { CatalogRow } from "@/components/products/types";
import {
  fetchPublicCatalogProduct,
  getActiveCatalogVariants,
  resolveDefaultCatalogVariant,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { resolveCheckoutUnitPriceMinor } from "@/lib/products/resolve-checkout-variant";
import {
  resolveAvailableStockQty,
} from "@/lib/products/product-stock";
import { fetchRelatedProductsByCategory } from "@/lib/products/related-products";

const featureTranslations = {
  "Premium quality products": {
    ps: "پریمیم کیفیت لرونکي توکي",
    "fa-AF": "محصولات باکیفیت ممتاز",
  },
  "Beautifully packaged": {
    ps: "په ښکلي ډول بسته‌بندي شوي",
    "fa-AF": "با بسته‌بندی زیبا",
  },
  "Perfect for any celebration": {
    ps: "د هرې لمانځنې لپاره مناسب",
    "fa-AF": "مناسب برای هر جشن",
  },
  "Same day delivery available": {
    ps: "همدا ورځ تحویل موجود",
    "fa-AF": "تحویل همان روز موجود",
  },
  "24 fresh red roses": {
    ps: "۲۴ تازه سره ګلابونه",
    "fa-AF": "۲۴ رز سرخ تازه",
  },
  "Hand-tied bouquet": {
    ps: "په لاس تړل شوی ګیډۍ",
    "fa-AF": "دسته‌گل دست‌بافت",
  },
  "Includes free greeting card": {
    ps: "وړیا مبارکي کارت پکې شامل دی",
    "fa-AF": "کارت تبریکی رایگان شامل است",
  },
  "Same day delivery": {
    ps: "همدا ورځ تحویل",
    "fa-AF": "تحویل همان روز",
  },
  "Premium quality ingredients": {
    ps: "پریمیم کیفیت لرونکي اجزا",
    "fa-AF": "مواد اولیه باکیفیت ممتاز",
  },
  "Perfect for family gatherings": {
    ps: "د کورنۍ غونډو لپاره مناسب",
    "fa-AF": "مناسب برای گردهمایی‌های خانوادگی",
  },
  "Serves 6-8 people": {
    ps: "د ۶-۸ کسانو لپاره بسنه کوي",
    "fa-AF": "برای ۶ تا ۸ نفر کافی است",
  },
  "Includes recipe suggestions": {
    ps: "د پخلي وړاندیزونه پکې شامل دي",
    "fa-AF": "پیشنهادهای دستور پخت شامل است",
  },
  "Handcrafted chocolates": {
    ps: "لاسي جوړ شوي چاکلېټونه",
    "fa-AF": "شکلات‌های دست‌ساز",
  },
  "Unique flavor combinations": {
    ps: "د خوند ځانګړې ګډونې",
    "fa-AF": "ترکیب‌های طعم منحصربه‌فرد",
  },
  "Beautiful gift packaging": {
    ps: "ښکلې د ډالۍ بسته‌بندي",
    "fa-AF": "بسته‌بندی زیبای هدیه",
  },
  "Perfect for gifting": {
    ps: "د ډالۍ لپاره مناسب",
    "fa-AF": "مناسب برای هدیه دادن",
  },
  "100% organic": {
    ps: "۱۰۰٪ ارګانیک",
    "fa-AF": "۱۰۰٪ ارگانیک",
  },
  "Farm fresh": {
    ps: "د فارم څخه تازه",
    "fa-AF": "تازه از فارم",
  },
  "Seasonal selection": {
    ps: "فصلي انتخاب",
    "fa-AF": "انتخاب فصلی",
  },
  "No pesticides": {
    ps: "بې له زهرجنو دواوو",
    "fa-AF": "بدون آفت‌کش",
  },
  "Multiple premium varieties": {
    ps: "د پریمیم څو ډولونه",
    "fa-AF": "چندین نوع ممتاز",
  },
  "High in nutrients": {
    ps: "په مغذي موادو بډایه",
    "fa-AF": "سرشار از مواد مغذی",
  },
  "Natural sweetener": {
    ps: "طبیعي خوږوونکی",
    "fa-AF": "شیرین‌کننده طبیعی",
  },
  "Perfect for Ramadan": {
    ps: "د رمضان لپاره مناسب",
    "fa-AF": "مناسب برای رمضان",
  },
  "Hypoallergenic products": {
    ps: "هایپو الرجنیک محصولات",
    "fa-AF": "محصولات ضد حساسیت",
  },
  "Safe for newborn skin": {
    ps: "د نوي زیږیدلي پوست لپاره خوندي",
    "fa-AF": "ایمن برای پوست نوزاد",
  },
  "Complete care kit": {
    ps: "بشپړ د پاملرنې کټ",
    "fa-AF": "کیت کامل مراقبت",
  },
  "Trusted brands": {
    ps: "باوري برانډونه",
    "fa-AF": "برندهای مورد اعتماد",
  },
  "Farm fresh fruits": {
    ps: "د فارم څخه تازه مېوې",
    "fa-AF": "میوه‌های تازه فارم",
  },
  "Large family size": {
    ps: "د کورنۍ لویه اندازه",
    "fa-AF": "اندازه بزرگ خانوادگی",
  },
  "Gift ready": {
    ps: "ډالۍ ته چمتو",
    "fa-AF": "آماده هدیه",
  },
} as const;

const localizeFeature = (feature: string, locale: "en" | "ps" | "fa-AF") => {
  if (locale === "en") return feature;
  return featureTranslations[feature as keyof typeof featureTranslations]?.[locale] ?? feature;
};

export default function ProductDetailPage() {
  const params = useParams();
  const locale = useLocale() as "en" | "ps" | "fa-AF";
  const isRtl = locale !== "en";
  const productId = params.id as string;
  const { formatPrice } = useCurrency();

  const [product, setProduct] = useState<PublicCatalogProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const resolved = await fetchPublicCatalogProduct(productId);

        if (!mounted) return;
        setProduct(resolved);
        setSelectedVariantId(resolveDefaultCatalogVariant(resolved.variants)?.id ?? null);

        const related = await fetchRelatedProductsByCategory(
          resolved.category,
          resolved.id
        );

        if (!mounted) return;
        setRelatedProducts(related);
      } catch {
        if (mounted) {
          setProduct(null);
          setRelatedProducts([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  const activeVariants = useMemo(
    () => (product ? getActiveCatalogVariants(product.variants) : []),
    [product]
  );

  const activeVariant = useMemo(() => {
    if (!product || activeVariants.length === 0) return null;
    return activeVariants.find((variant) => variant.id === selectedVariantId) ?? activeVariants[0];
  }, [product, activeVariants, selectedVariantId]);

  const productCurrency =
    product && "currency" in product && product.currency ? product.currency : "USD";

  const displayPrice = useMemo(() => {
    if (!product) return "";
    const unitPriceMinor = resolveCheckoutUnitPriceMinor({
      basePriceAmount: product.basePriceAmount,
      variants: product.variants,
      variantId: activeVariant?.id,
      productName: product.name[locale],
    });
    return formatPrice(unitPriceMinor / 100, productCurrency);
  }, [product, activeVariant?.id, formatPrice, productCurrency, locale]);

  const selectedLineTotal = useMemo(() => {
    if (!product || quantity <= 1) return null;
    const unitPriceMinor = resolveCheckoutUnitPriceMinor({
      basePriceAmount: product.basePriceAmount,
      variants: product.variants,
      variantId: activeVariant?.id,
      productName: product.name[locale],
    });
    return formatPrice((unitPriceMinor * quantity) / 100, productCurrency);
  }, [product, activeVariant?.id, formatPrice, productCurrency, locale, quantity]);

  const compareAtPrice = useMemo(() => {
    if (!product || product.price <= 50 || activeVariant) return null;
    return formatPrice(product.price * 1.15, productCurrency);
  }, [product, activeVariant, formatPrice, productCurrency]);

  const availableStock = useMemo(() => {
    if (!product) return 0;
    return resolveAvailableStockQty(product, activeVariant?.id);
  }, [product, activeVariant?.id]);

  const inStock = availableStock > 0;

  const handleAddToCart = async () => {
    if (!product) return;

    setIsAdding(true);
    try {
      await addItem(product.id, quantity, {
        variantId: activeVariant?.id,
        variantName: activeVariant?.name,
      });
      toast.success(locale === "en" ? `Added ${quantity} item(s) to cart!` : locale === "ps" ? `کارټ ته ${quantity} توکي اضافه شول!` : `${quantity} مورد به سبد اضافه شد!`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "en"
            ? "Failed to add to cart"
            : locale === "ps"
              ? "کارټ ته اضافه کول ناکام شول"
              : "افزودن به سبد ناموفق بود"
      );
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (quantity > availableStock && availableStock > 0) {
      setQuantity(availableStock);
    }
  }, [availableStock, quantity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

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
            <ChevronLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
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

  const productFeatures =
    product.features.length > 0
      ? product.features
      : [product.description[locale]].filter(Boolean);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex min-w-0 items-center gap-2 text-sm overflow-hidden">
            <Link
              href="/"
              className="text-gray-500 hover:text-primary hover:underline"
            >
              {locale === "en" ? "Home" : locale === "ps" ? "کور" : "خانه"}
            </Link>
            <ChevronRight className={`h-4 w-4 text-gray-400 ${isRtl ? "rotate-180" : ""}`} />
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
            <ChevronRight className={`h-4 w-4 text-gray-400 ${isRtl ? "rotate-180" : ""}`} />
            <span className="text-gray-900 font-medium truncate max-w-[8rem] sm:max-w-sm md:max-w-md">
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
                  className="hidden sm:flex flex-col gap-3 w-20 shrink-0 max-h-104 overflow-y-auto pr-1"
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
                      <CatalogImage src={img} alt="" fill className="object-cover" />
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
                <CatalogImage
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
                    <CatalogImage src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info - 5 columns */}
          <div className="lg:col-span-5">
            {/* Vendor & Title */}
            <Link
              href={`/vendors/${product.vendorSlug}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary hover:underline mb-2"
            >
              <Store className="h-4 w-4" />
              <span><bdi dir="ltr">{localizeVendor(product.vendor, locale)}</bdi></span>
              <ChevronRight className={`h-3 w-3 ${isRtl ? "rotate-180" : ""}`} />
            </Link>

            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 leading-tight">
              {product.name[locale]}
            </h1>

            {/* Rating */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
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
              <span className="text-sm text-green-600 font-medium">
                {inStock
                  ? locale === "en"
                    ? `In stock (${availableStock})`
                    : locale === "ps"
                      ? `په ذخیره کې (${availableStock})`
                      : `موجود (${availableStock})`
                  : locale === "en"
                    ? "Sold out"
                    : locale === "ps"
                      ? "پلورل شوی"
                      : "تمام شده"}
              </span>
            </div>

            {/* Price - Walmart Blue */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  {displayPrice}
                </span>
                {compareAtPrice ? (
                  <span className="text-sm text-gray-500">
                    {locale === "en" ? "Was" : locale === "ps" ? "و" : "بود"}{" "}
                    <span className="line-through">{compareAtPrice}</span>
                  </span>
                ) : null}
              </div>
              {selectedLineTotal ? (
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {locale === "en"
                    ? `${quantity} items: ${selectedLineTotal}`
                    : locale === "ps"
                      ? `${quantity} توکي: ${selectedLineTotal}`
                      : `${quantity} مورد: ${selectedLineTotal}`}
                </p>
              ) : null}
            </div>

            {product.description[locale] ? (
              <p className="mb-6 text-sm leading-relaxed text-gray-600">
                {product.description[locale]}
              </p>
            ) : null}

            {"availableCoupons" in product &&
            product.availableCoupons &&
            product.availableCoupons.length > 0 ? (
              <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Tag className="h-4 w-4" />
                  {locale === "en"
                    ? "Available offers"
                    : locale === "ps"
                      ? "شتونل شوي وړاندیزونه"
                      : "پیشنهادهای موجود"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.availableCoupons.map((coupon) => (
                    <span
                      key={coupon.code}
                      className="rounded-full border border-primary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary"
                    >
                      {coupon.code} · {coupon.label}
                      {!coupon.appliesToAllProducts ? ` · ${coupon.scopeLabel}` : ""}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-neutral-600">
                  {locale === "en"
                    ? "Use this code at checkout for this product."
                    : locale === "ps"
                      ? "د دې توکي لپاره په چک آوټ کې دا کوډ وکاروئ."
                      : "این کد را در تسویه‌حساب برای این محصول وارد کنید."}
                </p>
              </div>
            ) : null}

            {activeVariants.length > 0 && (
              <div className="mb-6">
                <span className="text-sm font-medium text-gray-700 mb-2 block">
                  {locale === "en" ? "Options" : locale === "ps" ? "انتخابونه" : "گزینه‌ها"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((variant) => {
                    const variantSoldOut = variant.stockQty <= 0;
                    const isSelected =
                      (selectedVariantId ?? activeVariants[0]?.id) === variant.id;

                    return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={variantSoldOut}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {variant.name}
                      {variantSoldOut
                        ? locale === "en"
                          ? " (Sold out)"
                          : locale === "ps"
                            ? " (پلورل شوی)"
                            : " (تمام شده)"
                        : ` (${variant.stockQty})`}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery Options - Walmart Style */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <Truck className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {localizeDelivery(product.delivery, locale)}
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
                    disabled={!inStock}
                    className={`px-4 py-2 hover:bg-gray-100 transition-colors text-lg font-medium disabled:opacity-50 ${
                      isRtl ? "rounded-r-full" : "rounded-l-full"
                    }`}
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                    disabled={!inStock || quantity >= availableStock}
                    className={`px-4 py-2 hover:bg-gray-100 transition-colors text-lg font-medium disabled:opacity-50 ${
                      isRtl ? "rounded-l-full" : "rounded-r-full"
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons - Walmart Style */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={isAdding || !inStock}
                className="flex-1 py-3.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAdding ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <ShoppingCart className="h-5 w-5" />
                )}
                {locale === "en"
                  ? "Add to cart"
                  : locale === "ps"
                    ? "کارټ ته اضافه کړئ"
                    : "افزودن به سبد"}
              </button>
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`h-[52px] w-[52px] flex items-center justify-center rounded-full border-2 transition-all ${
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
                {productFeatures.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-sm text-gray-700"
                  >
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{localizeFeature(feature, locale)}</span>
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
            {productFeatures.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  {localizeFeature(feature, locale)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <RelatedProducts
          products={relatedProducts}
          locale={locale}
          categorySlug={product.category}
          categoryLabel={
            "categoryName" in product && product.categoryName
              ? resolveLocalizedRecord(product.categoryName, locale)
              : product.category
          }
        />
      </div>
    </div>
  );
}
