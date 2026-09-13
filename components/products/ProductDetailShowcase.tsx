"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Truck,
} from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { getProductDetailCopy } from "@/components/products/product-detail-copy";
import { ProductReviews } from "@/components/products/ProductReviews";
import { RelatedProducts } from "@/components/products/RelatedProducts";
import type { CatalogRow } from "@/components/products/types";
import { Link } from "@/i18n/navigation";
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
import { useWishlist } from "@/store/wishlist-context";

type ProductDetailShowcaseProps = {
  product: PublicCatalogProduct;
  relatedProducts: CatalogRow[];
  locale: SupportedLocale;
  isRtl: boolean;
};

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-neutral-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-4 text-start"
      >
        <span className="text-base font-semibold text-neutral-900">{title}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-neutral-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="pb-5">{children}</div> : null}
    </div>
  );
}

export function ProductDetailShowcase({
  product,
  relatedProducts,
  locale,
  isRtl,
}: ProductDetailShowcaseProps) {
  const copy = getProductDetailCopy(locale);
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    () => resolveDefaultCatalogVariant(product.variants)?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [liveRating, setLiveRating] = useState(product.rating);
  const [liveReviews, setLiveReviews] = useState(product.reviews);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [policiesOpen, setPoliciesOpen] = useState(true);
  const addToCartRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const wishlisted = isInWishlist(product.id);

  useEffect(() => {
    const target = addToCartRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelectedImage(0);
    setSelectedVariantId(resolveDefaultCatalogVariant(product.variants)?.id ?? null);
    setQuantity(1);
    setLiveRating(product.rating);
    setLiveReviews(product.reviews);
    setDetailsOpen(true);
    setPoliciesOpen(true);
  }, [product.id, product.rating, product.reviews, product.variants]);

  const handleReviewSummaryChange = (summary: {
    ratingAverage: number;
    reviewCount: number;
  }) => {
    setLiveRating(summary.ratingAverage);
    setLiveReviews(summary.reviewCount);
  };

  const activeVariants = useMemo(
    () => getActiveCatalogVariants(product.variants),
    [product.variants],
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
  const showLowStock = inStock && availableStock > 0 && availableStock <= 5;

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

  const highlights = product.features.filter(Boolean);
  const vendorName = localizeVendor(product.vendor, locale);
  const vendorInitial = (vendorName.trim().charAt(0) || "M").toUpperCase();

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

  const toggleWishlist = () => {
    if (wishlisted) {
      removeFromWishlist(product.id);
      return;
    }
    addToWishlist({
      id: product.id,
      name: product.name[locale],
      price: unitPriceMinor / 100,
      priceDisplay: displayPrice,
      vendor: vendorName,
      image: images[0] ?? product.image,
    });
  };

  const goPrev = () => {
    setSelectedImage((idx) => (idx - 1 + images.length) % images.length);
  };

  const goNext = () => {
    setSelectedImage((idx) => (idx + 1) % images.length);
  };

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const qtyOptions = Array.from(
    { length: Math.max(1, Math.min(availableStock || 1, 20)) },
    (_, i) => i + 1,
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto w-full max-w-[1400px] px-3.5 py-5 sm:px-6 lg:px-8 lg:py-8">
        <nav
          aria-label={copy.breadcrumb}
          className="mb-5 flex min-w-0 flex-wrap items-center justify-center gap-1.5 text-sm text-neutral-500"
        >
          <Link href="/" className="underline-offset-2 transition hover:text-secondary hover:underline">
            {copy.home}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 opacity-50 ${isRtl ? "rotate-180" : ""}`} />
          <Link
            href="/products"
            className="underline-offset-2 transition hover:text-secondary hover:underline"
          >
            {copy.products}
          </Link>
          {categoryLabel ? (
            <>
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 opacity-50 ${isRtl ? "rotate-180" : ""}`}
              />
              <Link
                href={`/products/${encodeURIComponent(product.category)}`}
                className="underline-offset-2 transition hover:text-secondary hover:underline"
              >
                {categoryLabel}
              </Link>
            </>
          ) : null}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-10 xl:gap-14">
          {/* LEFT: gallery + reviews */}
          <div className="min-w-0 space-y-10">
            <section className="min-w-0">
              <div className="flex gap-3 sm:gap-4">
                {images.length > 1 ? (
                  <div className="hidden max-h-[560px] w-[72px] shrink-0 flex-col gap-2.5 overflow-y-auto lg:flex">
                    {images.map((img, idx) => (
                      <button
                        key={`${img}-${idx}`}
                        type="button"
                        onClick={() => setSelectedImage(idx)}
                        className={`relative aspect-square w-full overflow-hidden rounded-xl border-2 bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${
                          selectedImage === idx
                            ? "border-secondary"
                            : "border-transparent hover:border-neutral-300"
                        }`}
                      >
                        <CatalogImage
                          src={img}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="72px"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="group relative min-h-[280px] flex-1 overflow-hidden rounded-2xl bg-white sm:min-h-[420px] lg:aspect-square lg:min-h-0">
                  <CatalogImage
                    src={images[selectedImage] ?? images[0]}
                    alt={product.name[locale]}
                    fill
                    priority
                    className="object-contain p-3 sm:p-5"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                  />

                  {product.badge ? (
                    <span className="absolute top-3 inset-s-3 inline-flex items-center rounded-full bg-[#f5d76e] px-2.5 py-1 text-[11px] font-bold text-neutral-900 shadow-sm">
                      {product.badge[locale]}
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={toggleWishlist}
                    aria-label={wishlisted ? copy.removeFromWishlist : copy.addToWishlist}
                    className="absolute top-3 inset-e-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-800 shadow-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    <Heart
                      className={`h-5 w-5 ${wishlisted ? "fill-primary text-primary" : ""}`}
                      strokeWidth={1.75}
                    />
                  </button>

                  {images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        aria-label={copy.previousImage}
                        className="absolute top-1/2 inset-s-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-800 shadow-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <ChevronLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        aria-label={copy.nextImage}
                        className="absolute top-1/2 inset-e-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-800 shadow-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <ChevronRight className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {images.length > 1 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {images.map((img, idx) => (
                    <button
                      key={`m-${img}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                        selectedImage === idx ? "border-secondary" : "border-transparent"
                      }`}
                    >
                      <CatalogImage src={img} alt="" fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <div ref={reviewsRef} className="scroll-mt-24">
              <ProductReviews
                productId={product.id}
                locale={locale}
                ratingAverage={liveRating}
                reviewCount={liveReviews}
                onSummaryChange={handleReviewSummaryChange}
              />
            </div>
          </div>

          {/* RIGHT: buy column */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            {showLowStock ? (
              <p className="text-sm font-semibold text-red-600">{copy.lowStock(availableStock)}</p>
            ) : inStock ? (
              <p className="text-sm font-medium text-emerald-700">{copy.inStock}</p>
            ) : (
              <p className="text-sm font-semibold text-neutral-500">{copy.soldOut}</p>
            )}

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-[2rem]">
                {displayPrice}
              </p>
              {lineTotal ? (
                <p className="text-sm text-neutral-500">{copy.lineTotal(quantity, lineTotal)}</p>
              ) : null}
            </div>

            {"availableCoupons" in product &&
            product.availableCoupons &&
            product.availableCoupons.length > 0 ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  <Tag className="h-3.5 w-3.5" />
                  {copy.availableOffers}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {product.availableCoupons.map((coupon) => (
                    <span
                      key={coupon.code}
                      className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
                    >
                      {coupon.code} · {coupon.label}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-emerald-800/80">{copy.offerHint}</p>
              </div>
            ) : null}

            <h1 className="mt-4 text-lg font-normal leading-snug text-neutral-900 sm:text-xl">
              {product.name[locale]}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                href={`/vendors/${product.vendorSlug}`}
                className="text-sm font-semibold text-neutral-900 underline-offset-2 hover:underline"
              >
                <bdi dir="ltr">{vendorName}</bdi>
              </Link>
              <button
                type="button"
                onClick={scrollToReviews}
                className="inline-flex items-center gap-1.5 text-sm text-neutral-600 transition hover:text-secondary"
              >
                <span className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        liveReviews > 0 && i < Math.round(liveRating)
                          ? "fill-neutral-900 text-neutral-900"
                          : "fill-neutral-200 text-neutral-200"
                      }`}
                    />
                  ))}
                </span>
                {liveReviews > 0 ? (
                  <span>
                    {liveRating.toFixed(1)} ({liveReviews})
                  </span>
                ) : null}
              </button>
            </div>

            {activeVariants.length > 0 ? (
              <div className="mt-5">
                <label htmlFor="pdp-variant" className="mb-1.5 block text-sm font-semibold text-neutral-800">
                  {copy.variant}
                </label>
                <select
                  id="pdp-variant"
                  value={selectedVariantId ?? activeVariants[0]?.id ?? ""}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-neutral-300 bg-white px-3.5 pe-10 text-sm text-neutral-900 outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: isRtl ? "left 0.85rem center" : "right 0.85rem center",
                  }}
                >
                  {activeVariants.map((variant) => (
                    <option key={variant.id} value={variant.id} disabled={variant.stockQty <= 0}>
                      {variant.name}
                      {variant.stockQty <= 0 ? ` (${copy.soldOutLabel})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-4">
              <label htmlFor="pdp-qty" className="mb-1.5 block text-sm font-semibold text-neutral-800">
                {copy.quantity}
              </label>
              <select
                id="pdp-qty"
                value={quantity}
                disabled={!inStock}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="h-12 w-full max-w-[140px] appearance-none rounded-xl border border-neutral-300 bg-white px-3.5 pe-10 text-sm text-neutral-900 outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15 disabled:opacity-50"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: isRtl ? "left 0.85rem center" : "right 0.85rem center",
                }}
              >
                {qtyOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div ref={addToCartRef} className="mt-5">
              <button
                type="button"
                onClick={() => void handleAddToCart()}
                disabled={isAdding || !inStock}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {isAdding ? copy.adding : copy.addToCart}
              </button>
            </div>

            <div className="mt-6">
              <Accordion
                title={copy.itemDetails}
                open={detailsOpen}
                onToggle={() => setDetailsOpen((v) => !v)}
              >
                {highlights.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-neutral-900">{copy.highlights}</p>
                    <ul className="mt-2 space-y-2">
                      {highlights.map((item, idx) => (
                        <li key={`${item}-${idx}`} className="flex gap-2 text-sm text-neutral-700">
                          <Package className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {product.description[locale] ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                    {product.description[locale]}
                  </p>
                ) : null}
                <dl className="mt-4 space-y-2 text-sm text-neutral-700">
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-neutral-500">{copy.stock}:</dt>
                    <dd>
                      {inStock
                        ? `${copy.inStock}${availableStock > 0 ? ` (${availableStock})` : ""}`
                        : copy.soldOut}
                    </dd>
                  </div>
                  {categoryLabel ? (
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-medium text-neutral-500">
                        {copy.products}:
                      </dt>
                      <dd>{categoryLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              </Accordion>

              <Accordion
                title={copy.deliveryReturns}
                open={policiesOpen}
                onToggle={() => setPoliciesOpen((v) => !v)}
              >
                <ul className="space-y-4 text-sm text-neutral-700">
                  <li className="flex gap-3">
                    <Truck className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" strokeWidth={1.75} />
                    <div>
                      <p className="font-medium text-neutral-900">{copy.estimatedDelivery}</p>
                      <p className="mt-0.5 text-neutral-500">
                        {copy.shipsIn}: {copy.shipsInValue} · {copy.deliveryAreaValue}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <RotateCcw
                      className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500"
                      strokeWidth={1.75}
                    />
                    <div>
                      <p className="font-medium text-neutral-900">{copy.returnsAccepted}</p>
                      <p className="mt-0.5 text-neutral-500">{copy.returnsPolicy}</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" strokeWidth={1.75} />
                    <div>
                      <p className="font-medium text-neutral-900">
                        {copy.sentFrom}{" "}
                        <bdi dir="ltr">{vendorName}</bdi>
                      </p>
                      {product.delivery ? (
                        <p className="mt-0.5 text-neutral-500">
                          {localizeDelivery(product.delivery, locale)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500"
                      strokeWidth={1.75}
                    />
                    <div>
                      <p className="font-medium text-neutral-900">{copy.secureCheckout}</p>
                      <p className="mt-0.5 text-neutral-500">{copy.secureCheckoutDesc}</p>
                    </div>
                  </li>
                </ul>
              </Accordion>
            </div>
          </aside>
        </div>

        {/* Vendor / shop */}
        <section className="mt-12 border-t border-neutral-200 pt-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white shadow-sm"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #d4a84b, #8b6914 70%)",
                }}
                aria-hidden
              >
                {vendorInitial}
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
                  <bdi dir="ltr">{vendorName}</bdi>
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {product.sellerType === "PLATFORM" ? (
                    <span>{copy.ownedByMandawee}</span>
                  ) : null}
                </p>
                {liveReviews > 0 ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-neutral-900">
                    <Star className="h-3.5 w-3.5 fill-neutral-900 text-neutral-900" />
                    {liveRating.toFixed(1)} ({liveReviews})
                  </p>
                ) : null}
              </div>
            </div>

            <Link
              href={`/vendors/${product.vendorSlug}`}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-neutral-800 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              {copy.viewShop}
            </Link>
          </div>
        </section>

        <div className="mt-8">
          <RelatedProducts
            products={relatedProducts}
            locale={locale}
            categorySlug={product.category}
            categoryLabel={categoryLabel}
          />
        </div>
      </div>

      {showStickyBar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-3.5 py-2.5 shadow-[0_-8px_30px_rgba(15,52,96,0.1)] backdrop-blur-sm sm:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-neutral-500">{product.name[locale]}</p>
              <p className="text-base font-bold text-neutral-900">{displayPrice}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={isAdding || !inStock}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-secondary px-5 text-sm font-bold text-white transition hover:bg-[#0a2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {isAdding ? copy.adding : copy.addToCart}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
