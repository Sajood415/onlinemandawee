"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Grid,
  List,
  Truck,
  Tag,
  Store,
  Apple,
  Carrot,
  Milk,
  Cookie,
  Wine,
  Baby,
  Coffee,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useCart } from "@/store/cart-context";
import { useWishlist } from "@/store/wishlist-context";
import { QuickViewModal } from "@/components/home/QuickViewModal";
import { ProductSkeleton } from "@/components/home/SkeletonCard";
import productCatalog from "@/data/product.json";

type Product = {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  badge: string;
};

type HeroSlide = {
  id: number;
  image: string;
  alt: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  discount?: string;
};

type Category = {
  id: string;
  name: string;
  icon: React.ReactNode;
  href: string;
};

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    image: "/images/carousals/slide-1.jpg",
    alt: "",
    title: "",
    subtitle: "",
    cta: "",
    ctaLink: "/products?category=fresh",
    discount: "",
  },
  {
    id: 2,
    image: "/images/carousals/slide-2.jpg",
    alt: "",
    title: "",
    subtitle: "",
    cta: "",
    ctaLink: "/products?category=baby-care",
    discount: "",
  },
  {
    id: 3,
    image: "/images/carousals/slide-3.jpg",
    alt: "",
    title: "",
    subtitle: "",
    cta: "",
    ctaLink: "/deals",
    discount: "",
  },
];

const categories: Category[] = [
  { id: "breakfast", name: "", icon: <Coffee size={20} />, href: "/category/breakfast" },
  { id: "grocery", name: "", icon: <ShoppingCart size={20} />, href: "/category/grocery" },
  { id: "snacks", name: "", icon: <Cookie size={20} />, href: "/category/snacks" },
  { id: "beverages", name: "", icon: <Wine size={20} />, href: "/category/beverages" },
  { id: "fruits", name: "", icon: <Apple size={20} />, href: "/category/fruits" },
  { id: "vegetables", name: "", icon: <Carrot size={20} />, href: "/category/vegetables" },
  { id: "dairy", name: "", icon: <Milk size={20} />, href: "/category/dairy" },
  { id: "baby-care", name: "", icon: <Baby size={20} />, href: "/category/baby-care" },
];

type FeaturedProductSource = {
  id: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  name: { en: string; ps: string; "fa-AF": string };
  badge: { en: string; ps: string; "fa-AF": string };
};

type SupportedLocale = "en" | "ps" | "fa-AF";

const vendorTranslations = {
  "Noor Premium Gifts": { ps: "نور پریمیم ډالۍ", "fa-AF": "نور پریمیم هدایا" },
  "Bloom Avenue": { ps: "بلوم ایونیو", "fa-AF": "بلوم اونیو" },
  "Mandawee Market": { ps: "منډوي مارکیټ", "fa-AF": "بازار منداوی" },
  "Cocoa Stories": { ps: "کوکو کیسې", "fa-AF": "داستان‌های کاکائو" },
  "Fresh Farm Co": { ps: "فریش فارم شرکت", "fa-AF": "شرکت فارم تازه" },
  "Desert Delights": { ps: "صحرايي خوندونه", "fa-AF": "خوشی‌های صحرا" },
  "Tiny Tots Store": { ps: "ټایني ټاټس پلورنځی", "fa-AF": "فروشگاه تینی ټاتس" },
} as const;

function localizeVendor(vendor: string, locale: SupportedLocale) {
  if (locale === "en") return vendor;
  return vendorTranslations[vendor as keyof typeof vendorTranslations]?.[locale] ?? vendor;
}

function pickLocalized(field: FeaturedProductSource["name"], locale: string): string;
function pickLocalized(field: FeaturedProductSource["badge"], locale: string): string;
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

function ProductCard({
  product,
  onQuickView,
  locale,
  isListView = false,
}: {
  product: Product;
  onQuickView: (product: Product) => void;
  locale: SupportedLocale;
  isListView?: boolean;
}) {
  const t = useTranslations("HomeV2");
  const isRtl = locale !== "en";
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  const oldPrice = (product.price * 1.25).toFixed(2);
  const discount = Math.round(((parseFloat(oldPrice) - product.price) / parseFloat(oldPrice)) * 100);
  
  const handleWishlistToggle = () => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        priceDisplay: product.priceDisplay,
        vendor: product.vendor,
        image: product.image,
      });
    }
  };

  const handleAddToCart = () => {
    addItem(product.id, 1);
  };

  if (isListView) {
    // Clean List View Layout
    return (
      <motion.div
        whileHover={{ x: isRtl ? -4 : 4 }}
        className="group bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className="flex gap-4 p-4">
          {/* Product Image */}
          <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 96px"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
            />
            {discount > 0 && (
              <span className="absolute top-2 left-2 bg-[var(--secondary)] text-white text-xs font-medium px-2 py-1 rounded">
                -{discount}%
              </span>
            )}
            <button
              onClick={handleWishlistToggle}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-105"
              aria-label={t("productCard.toggleWishlist")}
            >
              <Heart
                size={16}
                className={`transition-colors duration-200 ${
                  isInWishlist(product.id)
                    ? "fill-[var(--secondary)] text-[var(--secondary)]"
                    : "text-gray-400 hover:text-[var(--secondary)]"
                }`}
              />
            </button>
          </div>
          
          {/* Product Details */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-[var(--secondary)] transition-colors duration-200">
                {product.name}
              </h3>
              <p className="text-xs text-gray-500 mb-2">{localizeVendor(product.vendor, locale)}</p>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  <span className={`text-xs text-gray-600 ${isRtl ? "mr-1" : "ml-1"}`}>4.8</span>
                </div>
                <span className="text-xs text-gray-400">(234)</span>
                <span className="text-xs text-green-600 font-medium">{t("productCard.inStock")}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-900">{product.priceDisplay}</p>
                {discount > 0 && (
                  <p className="text-xs text-gray-400 line-through">${oldPrice}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuickView(product)}
                  className="text-gray-600 hover:text-[var(--secondary)] p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={handleAddToCart}
                  className="bg-[var(--secondary)] text-white p-2 rounded-lg hover:brightness-110 transition-colors duration-200"
                >
                  <ShoppingCart size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Clean Grid View Layout
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group w-full min-w-0 bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Product Image */}
      <div className="relative h-40 overflow-hidden bg-gray-50 min-[420px]:h-44">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
        />
        
        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-[var(--secondary)] text-white text-xs font-medium px-2 py-1 rounded">
            -{discount}%
          </span>
        )}
        
        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-105"
          aria-label={t("productCard.toggleWishlist")}
        >
          <Heart
            size={16}
            className={`transition-colors duration-200 ${
              isInWishlist(product.id)
                ? "fill-[var(--secondary)] text-[var(--secondary)]"
                : "text-gray-400 hover:text-[var(--secondary)]"
            }`}
          />
        </button>
        
        {/* Quick View Button */}
        <button
          onClick={() => onQuickView(product)}
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full text-xs font-medium opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-105 shadow-sm"
        >
          {t("productCard.quickView")}
        </button>
      </div>
      
      {/* Product Details */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-[var(--secondary)] transition-colors duration-200">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 mb-2">{localizeVendor(product.vendor, locale)}</p>
        
        {/* Rating */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className={`text-xs text-gray-600 ${isRtl ? "mr-1" : "ml-1"}`}>4.8</span>
          </div>
          <span className="text-xs text-gray-400">(234)</span>
          <span className="text-xs text-green-600 font-medium">{t("productCard.inStock")}</span>
        </div>
        
        {/* Price and Cart */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">{product.priceDisplay}</p>
            {discount > 0 && (
              <p className="text-xs text-gray-400 line-through">${oldPrice}</p>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            className="bg-[var(--secondary)] text-white p-2 rounded-lg hover:brightness-110 transition-colors duration-200"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function HeroCarousel() {
  const t = useTranslations("HomeV2");
  const locale = useLocale();
  const isRtl = locale === "ps" || locale === "fa-AF";
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <div className="relative h-96 md:h-[500px] overflow-hidden z-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="relative h-full z-0"
        >
          <Image
            src={heroSlides[currentSlide].image}
            alt={t(`heroSlides.${currentSlide}.alt`)}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/45" />
          
          <div className="absolute inset-0 flex items-center">
            <div className={`container mx-auto px-4 sm:px-6 ${isRtl ? "sm:pr-16 lg:pr-20" : "sm:pl-16 lg:pl-20"}`}>
              <div className="max-w-2xl">
                {heroSlides[currentSlide].discount && (
                  <span className="inline-block bg-[var(--secondary)] text-white text-sm font-bold px-3 py-1 rounded-full mb-4">
                    {t(`heroSlides.${currentSlide}.discount`)}
                  </span>
                )}
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  {t(`heroSlides.${currentSlide}.title`)}
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-6">
                  {t(`heroSlides.${currentSlide}.subtitle`)}
                </p>
                <Link
                  href={heroSlides[currentSlide].ctaLink}
                  className="inline-flex items-center bg-[var(--secondary)] text-white px-6 py-3 rounded-lg font-semibold hover:brightness-110 transition-colors"
                >
                  {t(`heroSlides.${currentSlide}.cta`)}
                  <ChevronRight size={20} className={`${isRtl ? "mr-2 rotate-180" : "ml-2"}`} />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <button
        onClick={prevSlide}
        className={`absolute top-1/2 hidden -translate-y-1/2 bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 sm:block ${isRtl ? "right-2 sm:right-4" : "left-2 sm:left-4"}`}
      >
        {isRtl ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
      </button>
      <button
        onClick={nextSlide}
        className={`absolute top-1/2 hidden -translate-y-1/2 bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 sm:block ${isRtl ? "left-2 sm:left-4" : "right-2 sm:right-4"}`}
      >
        {isRtl ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`absolute bottom-4 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors ${isRtl ? "left-4" : "right-4"}`}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide ? "bg-white w-8" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function FilterSidebar() {
  const t = useTranslations("HomeV2");
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);

  const categories = [
    t("filters.categories.0"),
    t("filters.categories.1"),
    t("filters.categories.2"),
    t("filters.categories.3"),
    t("filters.categories.4"),
    t("filters.categories.5"),
    t("filters.categories.6"),
    t("filters.categories.7"),
  ];

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">{t("filters.title")}</h3>
        <button className="text-sm text-[var(--secondary)] hover:underline">{t("filters.clearAll")}</button>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">{t("filters.categoryTitle")}</h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <label key={category} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => toggleCategory(category)}
                className="rounded text-[var(--secondary)] focus:ring-[var(--secondary)]"
              />
              <span className="text-sm">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">{t("filters.priceRange")}</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">$</span>
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
              className="w-20 px-2 py-1 border rounded text-sm"
              placeholder={t("filters.min")}
            />
            <span className="text-sm">-</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 100])}
              className="w-20 px-2 py-1 border rounded text-sm"
              placeholder={t("filters.max")}
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">{t("filters.availability")}</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded text-[var(--secondary)] focus:ring-[var(--secondary)]"
            />
            <span className="text-sm">{t("filters.inStock")}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={(e) => setOnSaleOnly(e.target.checked)}
              className="rounded text-[var(--secondary)] focus:ring-[var(--secondary)]"
            />
            <span className="text-sm">{t("filters.onSale")}</span>
          </label>
        </div>
      </div>

      <button className="w-full bg-[var(--secondary)] text-white py-2 rounded-lg font-medium hover:brightness-110 transition-colors">
        {t("filters.apply")}
      </button>
    </div>
  );
}

export function HomeV2() {
  const locale = useLocale();
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const t = useTranslations("HomeV2");
  const [isLoading, setIsLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const products = useMemo(() => featuredProductsForLocale(locale), [locale]);
  const filteredProducts = useMemo(() => {
    const filtered = [...products];
    
    // Apply sorting
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    return filtered;
  }, [products, sortBy]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
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
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      <QuickViewModal 
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={closeQuickView}
      />

      {/* Hero Carousel - Full Width */}
      <section className="w-full">
        <HeroCarousel />
      </section>

      {/* Category Scroll - Modern Visually Appealing Design */}
      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-3">{t("categories.title")}</h2>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-[var(--secondary)] rounded-full"></div>
              <p className="text-gray-600 font-medium">{t("categories.subtitle")}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            {categories.map((category, idx) => (
              <Link
                key={category.id}
                href={category.href}
                className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-[var(--secondary)]/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[var(--secondary)]/[0.03]" />
                
                <div className="relative p-4 text-center">
                  {/* Icon Container */}
                  <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center rounded-xl bg-[var(--secondary)]/10 text-[var(--secondary)] transition-all duration-300 group-hover:scale-105">
                    {category.icon}
                  </div>
                  
                  {/* Category Name */}
                  <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-[var(--secondary)] transition-colors duration-500 line-clamp-2">
                    {t(`categoryItems.${idx}`)}
                  </h3>
                  
                  {/* Shop Badge */}
                  <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-y-0 translate-y-2">
                    <span className="text-xs font-semibold text-[var(--secondary)] bg-[var(--secondary)]/10 px-2 py-1 rounded-full">
                      {t("categories.shop")}
                    </span>
                  </div>
                </div>
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-[var(--secondary)]/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            ))}
          </div>
          
          <div className="flex justify-center mt-10">
            <Link
              href="/categories"
              className="group inline-flex items-center bg-[var(--secondary)] text-white px-8 py-4 rounded-full font-bold text-lg hover:brightness-110 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <span>{t("categories.exploreAll")}</span>
              <ChevronRight size={20} className={`${isRtl ? "mr-2 rotate-180 group-hover:-translate-x-1" : "ml-2 group-hover:translate-x-1"} transition-transform duration-300`} />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area - V1 Width */}
      <section className="bg-[var(--footerBg)] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex w-full min-w-0 gap-6 overflow-x-hidden">
            {/* Sidebar Filters */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <FilterSidebar />
            </div>

            {/* Product Grid */}
            <div className="min-w-0 flex-1">
              {/* Header */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{t("products.title")}</h2>
                    <p className="text-sm text-gray-500">{filteredProducts.length} {t("products.results")}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]"
                    >
                      <option value="default">{t("products.sort.featured")}</option>
                      <option value="price-low">{t("products.sort.lowToHigh")}</option>
                      <option value="price-high">{t("products.sort.highToLow")}</option>
                      <option value="rating">{t("products.sort.highestRated")}</option>
                    </select>
                    
                    <div className="flex border border-gray-200 rounded-lg">
                  <button
                        onClick={() => setViewMode("grid")}
                    className={`p-2 ${viewMode === "grid" ? "bg-[var(--secondary)] text-white" : "text-gray-600"}`}
                      >
                        <Grid size={16} />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                    className={`p-2 ${viewMode === "list" ? "bg-[var(--secondary)] text-white" : "text-gray-600"}`}
                      >
                        <List size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid/List */}
              {isLoading ? (
                <div className={viewMode === "grid" ? "grid w-full grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5" : "space-y-4"}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <ProductSkeleton key={index} />
                  ))}
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid w-full grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5" : "space-y-4"}>
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onQuickView={handleQuickView}
                      locale={safeLocale}
                      isListView={viewMode === "list"}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Sections - V1 Width */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Deals */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{t("sections.topDeals")}</h2>
            <Link href="/deals" className="text-[var(--secondary)] hover:underline text-sm font-medium">
              {t("sections.viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {products.slice(0, 6).map((product) => (
              <ProductCard
                key={`deal-${product.id}`}
                product={product}
                onQuickView={handleQuickView}
                locale={safeLocale}
              />
            ))}
          </div>
        </div>

        {/* Best Selling */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{t("sections.bestSelling")}</h2>
            <Link href="/best-selling" className="text-[var(--secondary)] hover:underline text-sm font-medium">
              {t("sections.viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {products.slice(6, 12).map((product) => (
              <ProductCard
                key={`best-${product.id}`}
                product={product}
                onQuickView={handleQuickView}
                locale={safeLocale}
              />
            ))}
          </div>
        </div>

        {/* Fresh Picks */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{t("sections.freshPicks")}</h2>
            <Link href="/fresh" className="text-[var(--secondary)] hover:underline text-sm font-medium">
              {t("sections.viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {products.slice(12, 18).map((product) => (
              <ProductCard
                key={`fresh-${product.id}`}
                product={product}
                onQuickView={handleQuickView}
                locale={safeLocale}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Banner - V1 Width */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[var(--secondary)] rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">{t("promo.title")}</h3>
              <p className="text-white/90 mb-4">{t("promo.description")}</p>
              <Link
                href="/weekend-deals"
                className="inline-flex items-center bg-white text-[var(--secondary)] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                {t("promo.cta")}
                <ChevronRight size={20} className={`${isRtl ? "mr-2" : "ml-2"}`} />
              </Link>
            </div>
            <div className="my-2 self-start text-5xl font-bold leading-none text-white/20 md:my-0 md:self-auto md:text-6xl">
              {t("promo.offBadge")}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-900">{t("sections.trending")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {products.slice(0, 6).map((p, index) => (
            <article key={`trend-${p.id}`} className="group rounded-lg border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="relative h-20 overflow-hidden bg-slate-50">
                <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                {index < 2 && (
                  <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                    {t("sections.trendingBadge")}
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-semibold text-slate-900 mb-1">{p.name}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                  <Star size={8} className="fill-yellow-400 text-yellow-400" />
                  <span>4.8</span>
                  <span className="text-slate-400">(234)</span>
                </div>
                <p className="text-xs font-bold text-primary">{p.priceDisplay}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.08)]">
          <h3 className="mb-4 text-2xl font-black text-slate-900">{t("why.title")}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Truck, title: t("why.items.0.title"), desc: t("why.items.0.desc") },
                { icon: Store, title: t("why.items.1.title"), desc: t("why.items.1.desc") },
                { icon: Tag, title: t("why.items.2.title"), desc: t("why.items.2.desc") },
                { icon: ShoppingCart, title: t("why.items.3.title"), desc: t("why.items.3.desc") },
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
