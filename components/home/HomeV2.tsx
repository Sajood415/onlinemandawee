"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ShoppingCart,
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Filter,
  Grid,
  List,
  MapPin,
  Clock,
  Truck,
  Shield,
  Tag,
  Store,
  Apple,
  Carrot,
  Milk,
  Cookie,
  Wine,
  Baby,
  Dumbbell,
  SprayCanIcon,
  PenTool,
  ChevronDown,
  X,
  Coffee,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useCart } from "@/store/cart-context";
import { useWishlist } from "@/store/wishlist-context";
import { QuickViewModal } from "@/components/home/QuickViewModal";
import { ProductSkeleton } from "@/components/home/SkeletonCard";
import productCatalog from "@/data/product.json";

type SupportedLocale = "en" | "ps" | "fa-AF";

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
    alt: "Fresh Groceries",
    title: "Fresh Groceries Delivered",
    subtitle: "Get 20% off on all fresh produce",
    cta: "Shop Now",
    ctaLink: "/products?category=fresh",
    discount: "20% OFF",
  },
  {
    id: 2,
    image: "/images/carousals/slide-2.jpg",
    alt: "Baby Care",
    title: "Baby Care Essentials",
    subtitle: "Everything your little one needs",
    cta: "Explore",
    ctaLink: "/products?category=baby-care",
    discount: "15% OFF",
  },
  {
    id: 3,
    image: "/images/carousals/slide-3.jpg",
    alt: "Special Offers",
    title: "Weekly Special Offers",
    subtitle: "Save big on your favorite items",
    cta: "View Deals",
    ctaLink: "/deals",
    discount: "UP TO 50% OFF",
  },
];

const categories: Category[] = [
  { id: "breakfast", name: "Breakfast Items", icon: <Coffee size={20} />, href: "/category/breakfast" },
  { id: "grocery", name: "Edible Grocery", icon: <ShoppingCart size={20} />, href: "/category/grocery" },
  { id: "snacks", name: "Snack Bar", icon: <Cookie size={20} />, href: "/category/snacks" },
  { id: "beverages", name: "Beverages", icon: <Wine size={20} />, href: "/category/beverages" },
  { id: "fruits", name: "Fruits", icon: <Apple size={20} />, href: "/category/fruits" },
  { id: "vegetables", name: "Vegetables", icon: <Carrot size={20} />, href: "/category/vegetables" },
  { id: "dairy", name: "Dairy", icon: <Milk size={20} />, href: "/category/dairy" },
  { id: "baby-care", name: "Baby Care", icon: <Baby size={20} />, href: "/category/baby-care" },
];

function featuredProductsForLocale(locale: string): Product[] {
  return (productCatalog.featuredProducts as any[]).map((row) => ({
    id: row.id,
    name: row.name[locale] || row.name.en,
    price: row.price,
    priceDisplay: row.priceDisplay,
    vendor: row.vendor,
    image: row.image,
    badge: row.badge[locale] || row.badge.en,
  }));
}

function ProductCard({ product, onQuickView, isListView = false }: { product: Product; onQuickView: (product: Product) => void; isListView?: boolean }) {
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
        whileHover={{ x: 4 }}
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
              aria-label="Toggle wishlist"
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
              <p className="text-xs text-gray-500 mb-2">{product.vendor}</p>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-gray-600 ml-1">4.8</span>
                </div>
                <span className="text-xs text-gray-400">(234)</span>
                <span className="text-xs text-green-600 font-medium">In Stock</span>
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
          aria-label="Toggle wishlist"
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
          Quick View
        </button>
      </div>
      
      {/* Product Details */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-[var(--secondary)] transition-colors duration-200">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 mb-2">{product.vendor}</p>
        
        {/* Rating */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600 ml-1">4.8</span>
          </div>
          <span className="text-xs text-gray-400">(234)</span>
          <span className="text-xs text-green-600 font-medium">In Stock</span>
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const slideRef = useRef<HTMLDivElement>(null);

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
            alt={heroSlides[currentSlide].alt}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/45" />
          
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-6 pl-20">
              <div className="max-w-2xl">
                {heroSlides[currentSlide].discount && (
                  <span className="inline-block bg-[var(--secondary)] text-white text-sm font-bold px-3 py-1 rounded-full mb-4">
                    {heroSlides[currentSlide].discount}
                  </span>
                )}
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  {heroSlides[currentSlide].title}
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-6">
                  {heroSlides[currentSlide].subtitle}
                </p>
                <Link
                  href={heroSlides[currentSlide].ctaLink}
                  className="inline-flex items-center bg-[var(--secondary)] text-white px-6 py-3 rounded-lg font-semibold hover:brightness-110 transition-colors"
                >
                  {heroSlides[currentSlide].cta}
                  <ChevronRight size={20} className="ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors"
      >
        <ChevronRight size={24} />
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors"
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
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);

  const categories = [
    "Fruits", "Vegetables", "Dairy", "Snacks", "Beverages", 
    "Baby Care", "Personal Care", "Fitness"
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
        <h3 className="font-semibold text-lg">Filters</h3>
        <button className="text-sm text-[var(--secondary)] hover:underline">Clear all</button>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Categories</h4>
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
        <h4 className="font-medium mb-3">Price Range</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">$</span>
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
              className="w-20 px-2 py-1 border rounded text-sm"
              placeholder="Min"
            />
            <span className="text-sm">-</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 100])}
              className="w-20 px-2 py-1 border rounded text-sm"
              placeholder="Max"
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Availability</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded text-[var(--secondary)] focus:ring-[var(--secondary)]"
            />
            <span className="text-sm">In Stock</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={(e) => setOnSaleOnly(e.target.checked)}
              className="rounded text-[var(--secondary)] focus:ring-[var(--secondary)]"
            />
            <span className="text-sm">On Sale</span>
          </label>
        </div>
      </div>

      <button className="w-full bg-[var(--secondary)] text-white py-2 rounded-lg font-medium hover:brightness-110 transition-colors">
        Apply Filters
      </button>
    </div>
  );
}

export function HomeV2() {
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const products = useMemo(() => featuredProductsForLocale(locale), [locale]);
  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    
    // Apply sorting
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        // Simulate rating sort
        filtered.sort(() => Math.random() - 0.5);
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
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
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
            <h2 className="text-3xl font-black text-gray-900 mb-3">Shop By Category</h2>
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-[var(--secondary)] rounded-full"></div>
              <p className="text-gray-600 font-medium">Browse our wide selection of products</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            {categories.map((category) => (
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
                    {category.name}
                  </h3>
                  
                  {/* Shop Badge */}
                  <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-y-0 translate-y-2">
                    <span className="text-xs font-semibold text-[var(--secondary)] bg-[var(--secondary)]/10 px-2 py-1 rounded-full">
                      Shop
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
              <span>Explore All Categories</span>
              <ChevronRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">All Products</h2>
                    <p className="text-sm text-gray-500">{filteredProducts.length} results</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]"
                    >
                      <option value="default">Sort by: Featured</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
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
            <h2 className="text-2xl font-bold text-gray-900">Top Deals</h2>
            <Link href="/deals" className="text-[var(--secondary)] hover:underline text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {products.slice(0, 6).map((product) => (
              <ProductCard
                key={`deal-${product.id}`}
                product={product}
                onQuickView={handleQuickView}
              />
            ))}
          </div>
        </div>

        {/* Best Selling */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Best Selling</h2>
            <Link href="/best-selling" className="text-[var(--secondary)] hover:underline text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {products.slice(6, 12).map((product) => (
              <ProductCard
                key={`best-${product.id}`}
                product={product}
                onQuickView={handleQuickView}
              />
            ))}
          </div>
        </div>

        {/* Fresh Picks */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Fresh Picks</h2>
            <Link href="/fresh" className="text-[var(--secondary)] hover:underline text-sm font-medium">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {products.slice(12, 18).map((product) => (
              <ProductCard
                key={`fresh-${product.id}`}
                product={product}
                onQuickView={handleQuickView}
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
              <h3 className="text-2xl font-bold mb-2">Weekend Special Offer!</h3>
              <p className="text-white/90 mb-4">Get up to 30% off on selected categories. Limited time only!</p>
              <Link
                href="/weekend-deals"
                className="inline-flex items-center bg-white text-[var(--secondary)] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Shop Now
                <ChevronRight size={20} className="ml-2" />
              </Link>
            </div>
            <div className="my-2 self-start text-5xl font-bold leading-none text-white/20 md:my-0 md:self-auto md:text-6xl">
              30% OFF
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-900">Top Trending Products</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {products.slice(0, 6).map((p, index) => (
            <article key={`trend-${p.id}`} className="group rounded-lg border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="relative h-20 overflow-hidden bg-slate-50">
                <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                {index < 2 && (
                  <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                    TRENDING
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
