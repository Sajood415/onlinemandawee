"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { toast } from "@/lib/utils/toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  ShoppingCart,
  Heart,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  Filter,
} from "lucide-react";
import productData from "@/data/product.json";
import { useCart } from "@/store/cart-context";

// Import data from JSON file
const allProducts = productData.featuredProducts;
const categories = productData.categories;
const vendors = productData.vendors;

export default function ProductsPage() {
  const locale = useLocale() as "en" | "ps" | "fa-AF";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("featured");

  // Filter products
  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = product.name[locale]
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    const matchesVendor =
      selectedVendor.length === 0 || selectedVendor.includes(product.vendor);
    const matchesPrice =
      product.price >= priceRange[0] && product.price <= priceRange[1];
    return matchesSearch && matchesCategory && matchesVendor && matchesPrice;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  const toggleVendor = (vendor: string) => {
    setSelectedVendor((prev) =>
      prev.includes(vendor)
        ? prev.filter((v) => v !== vendor)
        : [...prev, vendor],
    );
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedVendor([]);
    setPriceRange([0, 100]);
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedVendor.length > 0 ||
    priceRange[1] < 100 ||
    searchQuery;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb & Header Bar */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-primary hover:underline">
              {locale === "en" ? "Home" : locale === "ps" ? "کور" : "خانه"}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">
              {locale === "en"
                ? "All Products"
                : locale === "ps"
                  ? "ټول محصولات"
                  : "همه محصولات"}
            </span>
          </div>

          {/* Title & Search Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {locale === "en"
                  ? "All Products"
                  : locale === "ps"
                    ? "ټول محصولات"
                    : "همه محصولات"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {sortedProducts.length}{" "}
                {locale === "en"
                  ? "results"
                  : locale === "ps"
                    ? "پایلې"
                    : "نتایج"}
                {hasActiveFilters && (
                  <span>
                    {" "}
                    {locale === "en"
                      ? "with filters applied"
                      : locale === "ps"
                        ? "د فلټرونو سره"
                        : "با فیلترهای اعمال شده"}
                  </span>
                )}
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={
                  locale === "en"
                    ? "Search for products..."
                    : locale === "ps"
                      ? "د محصولاتو لټون..."
                      : "جستجوی محصولات..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 rounded-full border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-gray-200 bg-white text-gray-700 font-medium hover:border-primary transition-colors"
            >
              <Filter className="h-4 w-4" />
              {locale === "en" ? "Filter" : locale === "ps" ? "فلټر" : "فیلتر"}
              {hasActiveFilters && (
                <span className="ml-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {
                    [
                      selectedCategory !== "all",
                      selectedVendor.length > 0,
                      priceRange[1] < 100,
                      searchQuery,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 rounded-full border-2 border-gray-200 focus:border-primary focus:outline-none bg-white cursor-pointer font-medium text-gray-700 text-sm"
              >
                <option value="featured">
                  {locale === "en"
                    ? "Best Match"
                    : locale === "ps"
                      ? "غوره تطابق"
                      : "بهترین تطابق"}
                </option>
                <option value="price-low">
                  {locale === "en"
                    ? "Price: Low to High"
                    : locale === "ps"
                      ? "قیمت: کم به زیاد"
                      : "قیمت: کم به زیاد"}
                </option>
                <option value="price-high">
                  {locale === "en"
                    ? "Price: High to Low"
                    : locale === "ps"
                      ? "قیمت: زیاد به کم"
                      : "قیمت: زیاد به کم"}
                </option>
                <option value="rating">
                  {locale === "en"
                    ? "Top Rated"
                    : locale === "ps"
                      ? "ترټولو ښه"
                      : "بالاترین امتیاز"}
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-primary/5 transition-colors"
            >
              <X className="h-4 w-4" />
              {locale === "en"
                ? "Clear all"
                : locale === "ps"
                  ? "ټول پاک کړئ"
                  : "پاک کردن همه"}
            </button>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-4">
              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                  {locale === "en"
                    ? "Category"
                    : locale === "ps"
                      ? "کټګوري"
                      : "دسته"}
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-all ${
                        selectedCategory === cat.id
                          ? "bg-primary text-white font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span>{cat.label[locale]}</span>
                      {selectedCategory === cat.id && (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                  {locale === "en"
                    ? "Price"
                    : locale === "ps"
                      ? "قیمت"
                      : "قیمت"}
                </h3>
                <div className="px-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([0, parseInt(e.target.value)])
                    }
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-3 text-sm text-gray-700">
                    <span className="font-medium">$0</span>
                    <span className="font-bold text-primary">
                      Max: ${priceRange[1]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendors */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                  {locale === "en"
                    ? "Brand"
                    : locale === "ps"
                      ? "برانډ"
                      : "برند"}
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                  {vendors.slice(1).map((vendor) => (
                    <label
                      key={vendor}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                          selectedVendor.includes(vendor)
                            ? "bg-primary"
                            : "border-2 border-gray-300 group-hover:border-gray-400"
                        }`}
                      >
                        {selectedVendor.includes(vendor) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedVendor.includes(vendor)}
                        onChange={() => toggleVendor(vendor)}
                        className="sr-only"
                      />
                      <span
                        className={`text-sm ${selectedVendor.includes(vendor) ? "text-gray-900 font-medium" : "text-gray-600"}`}
                      >
                        {vendor}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Filters Drawer */}
          <AnimatePresence>
            {mobileFiltersOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileFiltersOpen(false)}
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 overflow-y-auto lg:hidden"
                >
                  <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-bold">
                      {locale === "en"
                        ? "Filters"
                        : locale === "ps"
                          ? "فلټرونه"
                          : "فیلترها"}
                    </h2>
                    <button onClick={() => setMobileFiltersOpen(false)}>
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* Categories */}
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase">
                        {locale === "en"
                          ? "Category"
                          : locale === "ps"
                            ? "کټګوري"
                            : "دسته"}
                      </h3>
                      <div className="space-y-1">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`w-full px-3 py-2.5 rounded-lg text-left text-sm ${
                              selectedCategory === cat.id
                                ? "bg-primary text-white font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {cat.label[locale]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="pb-6 border-b">
                      <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase">
                        {locale === "en"
                          ? "Price"
                          : locale === "ps"
                            ? "قیمت"
                            : "قیمت"}
                      </h3>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([0, parseInt(e.target.value)])
                        }
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-sm mt-2">
                        <span>$0</span>
                        <span className="font-bold">${priceRange[1]}</span>
                      </div>
                    </div>

                    {/* Vendors */}
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase">
                        {locale === "en"
                          ? "Brand"
                          : locale === "ps"
                            ? "برانډ"
                            : "برند"}
                      </h3>
                      <div className="space-y-2">
                        {vendors.slice(1).map((vendor) => (
                          <label
                            key={vendor}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center ${
                                selectedVendor.includes(vendor)
                                  ? "bg-primary"
                                  : "border-2 border-gray-300"
                              }`}
                            >
                              {selectedVendor.includes(vendor) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedVendor.includes(vendor)}
                              onChange={() => toggleVendor(vendor)}
                              className="sr-only"
                            />
                            <span className="text-sm text-gray-700">
                              {vendor}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t sticky bottom-0 bg-white">
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="w-full py-3 bg-primary text-white rounded-full font-bold"
                    >
                      {locale === "en"
                        ? "Show"
                        : locale === "ps"
                          ? "ښودل"
                          : "نمایش"}{" "}
                      {sortedProducts.length}{" "}
                      {locale === "en"
                        ? "Products"
                        : locale === "ps"
                          ? "محصولات"
                          : "محصول"}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          <div className="flex-1">
            {sortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <ProductCard product={product} locale={locale} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {locale === "en"
                    ? "No products found"
                    : locale === "ps"
                      ? "هیڅ محصول ونه موندل شو"
                      : "محصولی یافت نشد"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {locale === "en"
                    ? "Try adjusting your filters"
                    : locale === "ps"
                      ? "خپل فلټرونه تنظیم کړئ"
                      : "فیلترهای خود را تنظیم کنید"}
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
                >
                  {locale === "en"
                    ? "Clear all filters"
                    : locale === "ps"
                      ? "ټول فلټرونه پاک کړئ"
                      : "پاک کردن همه فیلترها"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  locale,
}: {
  product: (typeof allProducts)[0];
  locale: "en" | "ps" | "fa-AF";
}) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem, itemCount } = useCart();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAdding(true);
    try {
      await addItem(product.id, 1);
      toast.success(locale === "en" ? "Added to cart!" : locale === "ps" ? "کارټ ته اضافه شو!" : "به سبد اضافه شد!");
    } catch (error) {
      toast.error(locale === "en" ? "Failed to add to cart" : locale === "ps" ? "کارټ ته اضافه کول ناکام شول" : "افزودن به سبد ناموفق بود");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative">
      {/* Image Container - Walmart Style */}
      <Link
        href={`/products/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-gray-50 rounded-lg"
      >
        <Image
          src={product.image}
          alt={product.name[locale]}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badge - Walmart Style (top left, pill) */}
        {product.badge && (
          <div className="absolute top-2 left-2">
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                product.badge.en === "Best Seller"
                  ? "bg-primary text-white"
                  : "bg-green-100 text-green-700 border border-green-200"
              }`}
            >
              {product.badge[locale]}
            </span>
          </div>
        )}

        {/* Wishlist - small button top right */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
        >
          <Heart
            className={`h-4 w-4 ${isWishlisted ? "fill-red-500 text-red-500" : "text-gray-500"}`}
          />
        </button>

        {/* Add to Cart Button - appears on hover at bottom */}
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAdding ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
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
      </Link>

      {/* Content - Walmart Style */}
      <div className="pt-3">
        {/* Vendor */}
        <p className="text-xs text-gray-500 mb-1">{product.vendor}</p>

        {/* Title */}
        <Link href={`/products/${product.id}`}>
          <h3 className="text-sm text-gray-900 mb-2 line-clamp-2 hover:text-primary hover:underline transition-colors leading-snug">
            {product.name[locale]}
          </h3>
        </Link>

        {/* Price - Walmart Blue Style */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          {product.price > 50 && (
            <span className="text-xs text-gray-500">
              {locale === "en" ? "Was" : locale === "ps" ? "و" : "بود"} $
              {(product.price * 1.2).toFixed(2)}
            </span>
          )}
        </div>

        {/* Rating & Delivery */}
        <div className="flex items-center gap-3 text-xs">
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          </div>
          <span className="font-medium text-gray-900">{product.rating}</span>
          <span className="text-gray-500">({product.reviews})</span>
          <span className="mx-1 text-gray-300">|</span>
          <span className="text-green-600 font-medium">{product.delivery}</span>
        </div>
      </div>
    </div>
  );
}
