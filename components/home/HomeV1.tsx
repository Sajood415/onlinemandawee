"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Truck,
  Zap,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import { ProductSkeleton, CategorySkeleton, VendorSkeleton } from "@/components/home/SkeletonCard";
import { QuickViewModal } from "@/components/home/QuickViewModal";
import { useWishlist } from "@/store/wishlist-context";
import productCatalog from "@/data/product.json";

type SupportedLocale = "en" | "ps" | "fa-AF";

type FeaturedProductSource = {
  id: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  name: { en: string; ps: string; "fa-AF": string };
  badge: { en: string; ps: string; "fa-AF": string };
};

type Product = {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  badge: string;
};

const v1Copy: Record<
  SupportedLocale,
  {
    flashTitle: string;
    flashSub: string;
    viewAll: string;
    categoriesTitle: string;
    trendingTitle: string;
    topVendorsTitle: string;
    vendorCta: string;
    promoText: string;
    promoCta: string;
    essentialsTitle: string;
  }
> = {
  en: {
    flashTitle: "Best Deals Today",
    flashSub: "Limited-time prices from trusted vendors",
    viewAll: "View all deals",
    categoriesTitle: "Shop By Category",
    trendingTitle: "Trending Products",
    topVendorsTitle: "Top Vendors",
    vendorCta: "Visit Store",
    promoText: "Weekend Grocery Drop - up to 30% off selected categories",
    promoCta: "Shop Offers",
    essentialsTitle: "Daily Essentials",
  },
  ps: {
    flashTitle: "نن غوره تخفیفونه",
    flashSub: "له باوري پلورونکو محدود وخت بیې",
    viewAll: "ټول تخفیفونه",
    categoriesTitle: "د کټګورۍ له مخې پیرود",
    trendingTitle: "ترنډنګ محصولات",
    topVendorsTitle: "غوره پلورونکي",
    vendorCta: "پلورنځی وګورئ",
    promoText: "د اونۍ پای ځانګړی وړاندیز - تر 30٪ تخفیف",
    promoCta: "وړاندیزونه وګورئ",
    essentialsTitle: "ورځني ضروري توکي",
  },
  "fa-AF": {
    flashTitle: "بهترین تخفیف‌های امروز",
    flashSub: "قیمت‌های محدود از فروشندگان معتبر",
    viewAll: "مشاهده همه تخفیف‌ها",
    categoriesTitle: "خرید بر اساس دسته‌بندی",
    trendingTitle: "محصولات ترند",
    topVendorsTitle: "فروشندگان برتر",
    vendorCta: "دیدن فروشگاه",
    promoText: "پیشنهاد آخر هفته - تا 30٪ تخفیف روی دسته‌های منتخب",
    promoCta: "خرید پیشنهادها",
    essentialsTitle: "نیازمندی‌های روزانه",
  },
};

function pickLocalized(
  field: FeaturedProductSource["name"] | FeaturedProductSource["badge"],
  locale: string,
) {
  if (locale === "en" || locale === "ps" || locale === "fa-AF") return field[locale];
  return field.en;
}

function featuredProductsForLocale(locale: string): Product[] {
  return (productCatalog.featuredProducts as FeaturedProductSource[]).map((row) => ({
    id: row.id,
    name: pickLocalized(row.name, locale),
    price: row.price,
    priceDisplay: row.priceDisplay,
    vendor: row.vendor,
    image: row.image,
    badge: pickLocalized(row.badge, locale),
  }));
}

const vendorCards = [
  { name: "Noor Premium Gifts", rating: "4.9", products: "1.2k" },
  { name: "Mandawee Market", rating: "4.8", products: "980" },
  { name: "Fresh Farm Co", rating: "4.7", products: "760" },
  { name: "Bloom Avenue", rating: "4.8", products: "650" },
];

const categories = [
  { name: "Breakfast Items", image: "/categories/breakfastItems.webp", href: "/category/breakfast" },
  { name: "Edible Grocery", image: "/categories/edibleGrocery.webp", href: "/category/grocery" },
  { name: "Snack Bar", image: "/categories/snackBar.webp", href: "/category/snacks" },
  { name: "Beverages", image: "/categories/beverages.webp", href: "/category/beverages" },
  { name: "Fruits", image: "/categories/fruits.webp", href: "/category/fruits" },
  { name: "Vegetables", image: "/categories/vegetables.webp", href: "/category/vegetables" },
  { name: "Dairy", image: "/categories/dairyProducts.webp", href: "/category/dairy" },
  { name: "Baby Care", image: "/categories/babyCare.webp", href: "/category/baby-care" },
];

function ProductDealCard({ product, onQuickView }: { product: Product; onQuickView: (product: Product) => void }) {
  const oldPrice = (product.price * 1.25).toFixed(2);
  const isLowStock = product.price > 60;
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  const handleWishlistToggle = () => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.09)] transition hover:border-primary/20 hover:shadow-[0_18px_36px_rgba(220,53,69,0.16)]"
    >
      <div className="relative">
        <button
          onClick={handleWishlistToggle}
          className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md transition-all duration-300 hover:scale-110"
          aria-label="Toggle wishlist"
        >
          <Heart 
            size={16} 
            className={`transition-colors duration-200 ${
              isInWishlist(product.id) 
                ? "fill-red-500 text-red-500" 
                : "text-slate-600 hover:text-red-500"
            }`} 
          />
        </button>
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative h-48 overflow-hidden rounded-lg bg-slate-50">
            <Image 
                      src={product.image} 
                      alt={product.name} 
                      fill 
                      className="object-cover transition group-hover:scale-110"
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
                    />
            <div className="absolute inset-0 flex items-end justify-center bg-black/0 pb-3 opacity-0 transition group-hover:bg-black/15 group-hover:opacity-100">
              <button
                onClick={() => onQuickView(product)}
                className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-800 shadow transition hover:scale-105"
              >
                Quick View
              </button>
            </div>
          </div>
        </Link>
      </div>
      <div className="pt-3.5">
        <p className="line-clamp-2 min-h-10 text-[15px] font-bold leading-tight text-slate-900">{product.name}</p>
        <p className="mt-1 text-xs text-slate-500">{product.vendor}</p>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-500">
          <Star size={14} fill="currentColor" /> 4.8
        </div>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          {isLowStock ? "Low stock" : "In stock"}
        </p>
        <div className="mt-2.5 flex items-center justify-between">
          <div>
            <p className="text-lg font-black text-primary">${product.price.toFixed(2)}</p>
            <p className="text-xs text-slate-400 line-through">${oldPrice}</p>
          </div>
          <button className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-white transition active:scale-95 group-hover:brightness-110">
            Add to Cart
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function HomeV1() {
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const copy = v1Copy[safeLocale];
  const products = useMemo(() => featuredProductsForLocale(locale), [locale]);
  const bestDeals = useMemo(() => [...products, ...products].slice(0, 12), [products]);
  const trending = useMemo(() => [...products.slice(2), ...products.slice(0, 2)], [products]);
  const essentials = useMemo(() => [...products, ...products].slice(0, 12), [products]);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const dealScrollRef = useRef<HTMLDivElement>(null);

  // Simulate loading for demonstration
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const scrollCategories = (direction: "left" | "right") => {
    if (!categoryScrollRef.current) return;
    categoryScrollRef.current.scrollBy({
      left: direction === "right" ? 320 : -320,
      behavior: "smooth",
    });
  };

  const scrollDeals = (direction: "left" | "right") => {
    if (!dealScrollRef.current) return;
    dealScrollRef.current.scrollBy({
      left: direction === "right" ? 360 : -360,
      behavior: "smooth",
    });
  };

  // Touch gesture handling for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent, scrollRef: React.RefObject<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const touch = e.touches[0];
    (scrollRef.current as any).touchStartX = touch.clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, scrollRef: React.RefObject<HTMLDivElement>, scrollAmount: number) => {
    if (!scrollRef.current) return;
    const touch = e.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchStartX = (scrollRef.current as any).touchStartX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        // Swipe left - scroll right
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        // Swipe right - scroll left
        scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    }
  }, []);

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const closeQuickView = () => {
    setIsQuickViewOpen(false);
    setTimeout(() => setQuickViewProduct(null), 300);
  };

  return (
    <div className="bg-[#f8fafc]">
      <Hero />

      <QuickViewModal 
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={closeQuickView}
      />

      <section className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900">{copy.categoriesTitle}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollCategories("left")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/30 hover:text-primary"
                aria-label="Scroll categories left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollCategories("right")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/30 hover:text-primary"
                aria-label="Scroll categories right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div
            ref={categoryScrollRef}
            className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-y"
            onTouchStart={(e) => handleTouchStart(e, categoryScrollRef)}
            onTouchEnd={(e) => handleTouchEnd(e, categoryScrollRef, 320)}
          >
            {isLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <CategorySkeleton key={`cat-skeleton-${index}`} />
                ))
              : categories.map((category) => (
                  <Link
                    key={category.name}
                    href={category.href}
                    className="group w-[165px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-[0_6px_14px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_14px_28px_rgba(220,53,69,0.14)]"
                  >
                    <div className="relative h-22 overflow-hidden rounded-md bg-slate-50">
                      <Image src={category.image} alt={category.name} fill className="object-cover transition group-hover:scale-110" />
                    </div>
                    <p className="mt-2.5 line-clamp-1 text-center text-sm font-bold text-slate-800">{category.name}</p>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-[#f8fafc] to-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                <Zap size={12} /> Flash Deals
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">{copy.flashTitle}</h2>
              <p className="text-sm text-slate-500">{copy.flashSub}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-full bg-white px-4 py-2 text-xs font-bold text-primary shadow-sm sm:flex sm:items-center sm:gap-2">
                <Clock3 size={14} /> 06:14:29
              </div>
              <button
                onClick={() => scrollDeals("left")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/30 hover:text-primary"
                aria-label="Scroll deals left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollDeals("right")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/30 hover:text-primary"
                aria-label="Scroll deals right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div
            ref={dealScrollRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-y"
            onTouchStart={(e) => handleTouchStart(e, dealScrollRef)}
            onTouchEnd={(e) => handleTouchEnd(e, dealScrollRef, 360)}
          >
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={`deal-skeleton-${index}`} className="w-[295px] shrink-0 snap-start">
                    <ProductSkeleton />
                  </div>
                ))
              : bestDeals.map((product, index) => (
                  <div key={`deal-${product.id}-${index}`} className="w-[295px] shrink-0 snap-start">
                    <ProductDealCard product={product} onQuickView={handleQuickView} />
                  </div>
                ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/products" className="text-sm font-bold text-primary hover:underline">
              {copy.viewAll}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FeaturedProducts
            products={trending}
            viewAllLabel={copy.viewAll}
            addToCartLabel="Add to cart"
            eyebrow="Trending now"
            title={copy.trendingTitle}
            description="Top-selling products customers are buying right now."
          />
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">{copy.topVendorsTitle}</h2>
            <Link href="/vendors" className="text-sm font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <VendorSkeleton key={`vendor-skeleton-${index}`} />
                ))
              : vendorCards.map((vendor, index) => (
                  <motion.article
                    key={vendor.name}
                    whileHover={{ y: -4 }}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.10)] transition hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_36px_rgba(220,53,69,0.16)]"
                  >
                    <div className="relative h-32 w-full bg-slate-100">
                      <Image
                        src={products[index]?.image ?? "/images/carousals/slide-1.jpg"}
                        alt={vendor.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                      <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow">
                        <Store size={21} />
                      </div>
                      <span className="absolute bottom-3 left-4 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-800">
                        Verified Vendor
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="line-clamp-1 text-base font-bold text-slate-900">{vendor.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{vendor.products} products</p>
                      <div className="mt-2 flex items-center gap-1 text-sm text-amber-500">
                        <Star size={14} fill="currentColor" /> {vendor.rating}
                      </div>
                      <button className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99]">
                        {copy.vendorCta}
                      </button>
                    </div>
                  </motion.article>
                ))}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-[#cf1427] to-[#b90f1d] px-5 py-6 text-white shadow-lg">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15" />
            <div className="absolute -bottom-10 right-28 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm font-bold sm:text-base">{copy.promoText}</p>
              <Link href="/deals" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-primary">
                {copy.promoCta} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-3">
            <div>
              <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700">
                <Tag size={12} /> Daily Essentials
              </p>
              <h2 className="text-4xl font-black tracking-tight text-slate-900">{copy.essentialsTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">Your everyday needs at unbeatable prices</p>
            </div>
            <Link href="/products" className="text-sm font-bold text-primary hover:underline">
              {copy.viewAll}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <ProductSkeleton key={`ess-skeleton-${index}`} />
                ))
              : essentials.slice(0, 8).map((product, index) => (
                  <motion.article
                    key={`ess-${product.id}-${index}`}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition-all duration-300 hover:border-primary/25 hover:shadow-[0_24px_48px_rgba(220,53,69,0.18)]"
                  >
                    <Link href={`/products/${product.id}`}>
                      <div className="relative h-48 overflow-hidden bg-slate-50">
                        <Image 
                          src={product.image} 
                          alt={product.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
                          🔥 Hot Deal
                        </span>
                        <div className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 transition-all duration-300 group-hover:opacity-100">
                          <ShoppingCart size={16} className="text-primary" />
                        </div>
                      </div>
                    </Link>
                    <div className="p-5">
                      <div className="mb-3">
                        <p className="line-clamp-2 text-base font-bold text-slate-900 leading-tight">{product.name}</p>
                        <p className="mt-1 text-sm text-slate-500 font-medium">{product.vendor}</p>
                      </div>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={14} fill="currentColor" />
                          <span className="text-sm font-semibold">4.8</span>
                        </div>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">234 sold</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-black text-primary">{product.priceDisplay}</p>
                          <p className="text-xs text-slate-400 line-through">$12.99</p>
                        </div>
                        <button className="rounded-xl bg-gradient-to-r from-primary to-primary/90 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:from-primary/90 hover:to-primary hover:shadow-lg active:scale-95">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.08)]">
            <h3 className="mb-4 text-2xl font-black text-slate-900">Why shoppers choose Mandawee</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Truck, title: "Fast Delivery", desc: "Same-day delivery on selected items" },
                { icon: Store, title: "Verified Vendors", desc: "Trusted stores with quality standards" },
                { icon: Tag, title: "Daily Deals", desc: "Fresh promotions and limited-time offers" },
                { icon: ShoppingCart, title: "Easy Checkout", desc: "Quick cart and secure payments" },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon size={18} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

