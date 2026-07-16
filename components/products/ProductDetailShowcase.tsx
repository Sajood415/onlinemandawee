"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Headphones,
  Loader2,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Truck,
} from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { getProductDetailCopy } from "@/components/products/product-detail-copy";
import { ProductReviews } from "@/components/products/ProductReviews";
import { RelatedProducts } from "@/components/products/RelatedProducts";
import type { CatalogRow } from "@/components/products/types";
import { Link } from "@/i18n/navigation";
import { SITE_CONTACT } from "@/lib/content/contact-info";
import { resolveLocalizedRecord } from "@/lib/localization/product-content";
import {
  localizeDelivery,
  localizeVendor,
  type SupportedLocale,
} from "@/lib/localization/product-vendor";
import {
  getActiveCatalogVariants,
  resolveDefaultCatalogVariant,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { resolveAvailableStockQty } from "@/lib/products/product-stock";
import { resolveCheckoutUnitPriceMinor } from "@/lib/products/resolve-checkout-variant";
import { toast } from "@/lib/utils/toast";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";

type ProductDetailShowcaseProps = {
  product: PublicCatalogProduct;
  relatedProducts: CatalogRow[];
  locale: SupportedLocale;
  isRtl: boolean;
};

type TabKey = "description" | "reviews";

export function ProductDetailShowcase({
  product,
  relatedProducts,
  locale,
  isRtl,
}: ProductDetailShowcaseProps) {
  const copy = getProductDetailCopy(locale);
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    () => resolveDefaultCatalogVariant(product.variants)?.id ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [tab, setTab] = useState<TabKey>("description");

  useEffect(() => {
    setSelectedImage(0);
    setSelectedVariantId(resolveDefaultCatalogVariant(product.variants)?.id ?? null);
    setQuantity(1);
    setTab("description");
  }, [product.id, product.variants]);

  const activeVariants = useMemo(
    () => getActiveCatalogVariants(product.variants),
    [product.variants]
  );

  const activeVariant = useMemo(() => {
    if (activeVariants.length === 0) return null;
    return activeVariants.find((variant) => variant.id === selectedVariantId) ?? activeVariants[0];
  }, [activeVariants, selectedVariantId]);

  const productCurrency = product.currency || "USD";
  const unitPriceMinor = resolveCheckoutUnitPriceMinor({
    basePriceAmount: product.basePriceAmount,
    variants: product.variants,
    variantId: activeVariant?.id,
    productName: product.name[locale],
  });
  const displayPrice = formatPrice(unitPriceMinor / 100, productCurrency);
  const lineTotal =
    quantity > 1 ? formatPrice((unitPriceMinor * quantity) / 100, productCurrency) : null;

  const availableStock = resolveAvailableStockQty(product, activeVariant?.id);
  const inStock = availableStock > 0;

  useEffect(() => {
    if (quantity > availableStock && availableStock > 0) {
      setQuantity(availableStock);
    }
  }, [availableStock, quantity]);

  const images = product.images.length > 0 ? product.images : [product.image];
  const categoryLabel =
    "categoryName" in product && product.categoryName
      ? resolveLocalizedRecord(product.categoryName, locale)
      : product.category;

  const highlights =
    product.features.length > 0
      ? product.features
      : [product.description[locale]].filter(Boolean);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addItem(product.id, quantity, {
        variantId: activeVariant?.id,
        variantName: activeVariant?.name,
      });
      toast.success(copy.addedToast(quantity));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.addError);
    } finally {
      setIsAdding(false);
    }
  };

  const trustItems = [
    {
      icon: Truck,
      title: copy.trustShipping,
      description: copy.trustShippingDesc,
    },
    {
      icon: RotateCcw,
      title: copy.trustReturns,
      description: copy.trustReturnsDesc,
    },
    {
      icon: ShieldCheck,
      title: copy.trustPayment,
      description: copy.trustPaymentDesc,
    },
    {
      icon: Headphones,
      title: copy.trustSupport,
      description: SITE_CONTACT.phoneDisplay,
    },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <nav
          aria-label={copy.breadcrumb}
          className="mb-5 flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-neutral-400"
        >
          <Link href="/" className="transition hover:text-[#0F3460] hover:underline">
            {copy.home}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <Link href="/products" className="transition hover:text-[#0F3460] hover:underline">
            {copy.products}
          </Link>
          {categoryLabel ? (
            <>
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
              <Link
                href={`/category/${product.category}`}
                className="transition hover:text-[#0F3460] hover:underline"
              >
                {categoryLabel}
              </Link>
            </>
          ) : null}
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <span className="truncate text-neutral-800">{product.name[locale]}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_220px] lg:gap-8 xl:gap-10">
          {/* Gallery */}
          <section className="min-w-0">
            <div className="flex gap-3">
              {images.length > 1 ? (
                <div className="hidden max-h-[480px] w-[72px] shrink-0 flex-col gap-2 overflow-y-auto sm:flex">
                  {images.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`relative aspect-square w-full overflow-hidden border transition ${
                        selectedImage === idx
                          ? "border-[#0F3460]"
                          : "border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <CatalogImage src={img} alt="" fill className="object-contain p-1" sizes="72px" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="relative min-h-[280px] flex-1 aspect-square overflow-hidden bg-neutral-50 sm:min-h-[420px]">
                <CatalogImage
                  src={images[selectedImage] ?? images[0]}
                  alt={product.name[locale]}
                  fill
                  priority
                  className="object-contain p-4 sm:p-6"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
                {product.badge ? (
                  <span className="absolute bottom-3 inset-s-3 bg-[#ec1b23] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    {product.badge[locale]}
                  </span>
                ) : null}
              </div>
            </div>

            {images.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto sm:hidden">
                {images.map((img, idx) => (
                  <button
                    key={`m-${img}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden border ${
                      selectedImage === idx ? "border-[#0F3460]" : "border-neutral-200"
                    }`}
                  >
                    <CatalogImage src={img} alt="" fill className="object-contain p-1" sizes="64px" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {/* Product info */}
          <section className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm font-bold text-neutral-900">
                <bdi dir="ltr">{localizeVendor(product.vendor, locale)}</bdi>
              </p>
              <Link
                href={`/vendors/${product.vendorSlug}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#ec1b23] hover:underline"
              >
                <Store className="h-3.5 w-3.5" />
                {copy.visitStore}
              </Link>
            </div>

            <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight text-[#0F3460] sm:text-[1.75rem]">
              {product.name[locale]}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < Math.floor(product.rating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-neutral-200 text-neutral-200"
                    }`}
                  />
                ))}
              </div>
              {product.reviews > 0 ? (
                <button
                  type="button"
                  onClick={() => setTab("reviews")}
                  className="text-sm text-neutral-500 hover:text-[#0F3460] hover:underline"
                >
                  {product.rating.toFixed(1)} · {product.reviews} {copy.reviews}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setTab("reviews")}
                  className="text-sm text-neutral-500 hover:text-[#0F3460] hover:underline"
                >
                  {copy.beFirstReview}
                </button>
              )}
            </div>

            <p className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">{displayPrice}</p>
            {lineTotal ? (
              <p className="mt-1 text-sm text-neutral-500">{copy.lineTotal(quantity, lineTotal)}</p>
            ) : null}

            {"availableCoupons" in product &&
            product.availableCoupons &&
            product.availableCoupons.length > 0 ? (
              <div className="mt-4 border border-[#ec1b23]/20 bg-[#ec1b23]/5 px-3 py-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#ec1b23]">
                  <Tag className="h-3.5 w-3.5" />
                  {copy.availableOffers}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.availableCoupons.map((coupon) => (
                    <span
                      key={coupon.code}
                      className="border border-[#ec1b23]/25 bg-white px-2.5 py-1 text-xs font-semibold text-[#ec1b23]"
                    >
                      {coupon.code} · {coupon.label}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-neutral-500">{copy.offerHint}</p>
              </div>
            ) : null}

            <dl className="mt-5 space-y-2.5 border-y border-neutral-200 py-4 text-sm">
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-neutral-500">{copy.stock}</dt>
                <dd className="flex items-center gap-1.5 font-medium text-neutral-900">
                  {inStock ? (
                    <>
                      <Check className="h-4 w-4 text-[#0F3460]" />
                      {copy.inStock}
                      {availableStock > 0 ? ` (${availableStock})` : ""}
                    </>
                  ) : (
                    copy.soldOut
                  )}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-neutral-500">{copy.shipsIn}</dt>
                <dd className="font-medium text-neutral-900">{copy.shipsInValue}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-neutral-500">{copy.deliveryArea}</dt>
                <dd className="font-medium text-neutral-900">{copy.deliveryAreaValue}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-neutral-500">{copy.shippedBy}</dt>
                <dd className="font-medium text-neutral-900">
                  <bdi dir="ltr">{localizeVendor(product.vendor, locale)}</bdi>
                  {product.delivery ? (
                    <span className="font-normal text-neutral-500">
                      {" "}
                      · {localizeDelivery(product.delivery, locale)}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>

            {activeVariants.length > 0 ? (
              <div className="mt-5">
                <p className="text-sm font-semibold text-neutral-800">
                  {copy.variant}
                  {activeVariant ? (
                    <span className="font-normal text-neutral-500">: {activeVariant.name}</span>
                  ) : null}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeVariants.map((variant) => {
                    const soldOut = variant.stockQty <= 0;
                    const selected =
                      (selectedVariantId ?? activeVariants[0]?.id) === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={soldOut}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          selected
                            ? "border-[#ec1b23] bg-white font-semibold text-neutral-900"
                            : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        {variant.name}
                        {soldOut ? ` (${copy.soldOutLabel})` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-neutral-800">{copy.quantity}</p>
              <div className="inline-flex items-center border border-neutral-300">
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center text-lg text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
                >
                  −
                </button>
                <span className="min-w-10 text-center text-sm font-semibold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={!inStock || quantity >= availableStock}
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  className="flex h-10 w-10 items-center justify-center text-lg text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={isAdding || !inStock}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#ec1b23] px-5 text-sm font-bold text-white transition hover:bg-[#c9161d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {isAdding ? copy.adding : copy.addToCart}
            </button>
          </section>

          {/* Trust sidebar */}
          <aside className="hidden border border-neutral-200 lg:block lg:self-start">
            <ul className="divide-y divide-neutral-200">
              {trustItems.map((item) => (
                <li key={item.title} className="flex items-start gap-3 px-4 py-4">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0F3460]" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Mobile trust strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 border border-neutral-200 p-3 lg:hidden">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-start gap-2">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0F3460]" />
              <div>
                <p className="text-xs font-semibold text-neutral-900">{item.title}</p>
                <p className="text-[11px] text-neutral-500">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <section className="mt-10 border-t border-neutral-200 pt-0">
          <div className="flex border-b border-neutral-200">
            <button
              type="button"
              onClick={() => setTab("description")}
              className={`px-5 py-3 text-sm font-semibold uppercase tracking-wide transition ${
                tab === "description"
                  ? "border-b-2 border-[#0F3460] text-[#0F3460]"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {copy.description}
            </button>
            <button
              type="button"
              onClick={() => setTab("reviews")}
              className={`px-5 py-3 text-sm font-semibold uppercase tracking-wide transition ${
                tab === "reviews"
                  ? "border-b-2 border-[#0F3460] text-[#0F3460]"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {copy.reviewsTab}
            </button>
          </div>

          {tab === "description" ? (
            <div className="py-6">
              {highlights.length > 0 ? (
                <div className="mb-6">
                  <h2 className="text-base font-bold text-neutral-900">{copy.highlights}</h2>
                  <ul className="mt-3 space-y-2">
                    {highlights.map((item, idx) => (
                      <li key={`${item}-${idx}`} className="flex gap-2 text-sm text-neutral-700">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#0F3460]" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {product.description[locale] ? (
                <p className="max-w-3xl text-sm leading-relaxed text-neutral-600">
                  {product.description[locale]}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="py-6">
              <ProductReviews productId={product.id} locale={locale} />
            </div>
          )}
        </section>

        <div className="mt-4">
          <RelatedProducts
            products={relatedProducts}
            locale={locale}
            categorySlug={product.category}
            categoryLabel={categoryLabel}
          />
        </div>
      </div>
    </div>
  );
}
