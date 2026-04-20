"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingCart, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "@/store/cart-context";
import { toast } from "@/lib/utils/toast";
import { useLocale } from "next-intl";

type Product = {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  badge: string;
};

const vendorTranslations = {
  "Noor Premium Gifts": { ps: "نور پریمیم ډالۍ", "fa-AF": "نور پریمیم هدایا" },
  "Bloom Avenue": { ps: "بلوم ایونیو", "fa-AF": "بلوم اونیو" },
  "Mandawee Market": { ps: "منډوي مارکیټ", "fa-AF": "بازار منداوی" },
  "Cocoa Stories": { ps: "کوکو کیسې", "fa-AF": "داستان‌های کاکائو" },
  "Fresh Farm Co": { ps: "فریش فارم شرکت", "fa-AF": "شرکت فارم تازه" },
  "Desert Delights": { ps: "صحرايي خوندونه", "fa-AF": "خوشی‌های صحرا" },
  "Tiny Tots Store": { ps: "ټایني ټاټس پلورنځی", "fa-AF": "فروشگاه تینی ټاتس" },
} as const;

const localizeVendor = (vendor: string, locale: "en" | "ps" | "fa-AF") => {
  if (locale === "en") return vendor;
  return vendorTranslations[vendor as keyof typeof vendorTranslations]?.[locale] ?? vendor;
};

const featuredUiCopy = {
  en: { quickCheckout: "Quick Checkout", giftReady: "Gift-ready picks", add: "Add" },
  ps: { quickCheckout: "چټک خرید", giftReady: "ډالۍ ته چمتو توکي", add: "اضافه" },
  "fa-AF": { quickCheckout: "خرید سریع", giftReady: "انتخاب‌های آماده هدیه", add: "افزودن" },
} as const;

type FeaturedProductsProps = {
  products: Product[];
  viewAllLabel: string;
  addToCartLabel: string;
  eyebrow: string;
  title: string;
  description: string;
};

// Extract numeric price from number
function extractPrice(price: number): { original: number; offer: number } {
  const original = price;
  const offer = Math.round(original * 0.8 * 100) / 100; // 20% off
  return { original, offer };
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const [count, setCount] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();
  const locale = useLocale();
  const safeLocale = locale === "ps" || locale === "fa-AF" ? locale : "en";
  const ui = featuredUiCopy[safeLocale];
  const { original, offer } = extractPrice(product.price);
  const priceDisplay = product.priceDisplay;
  const rating = 4;

  return (
      <motion.article
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 100 }}
        className="group border rounded-lg bg-white overflow-hidden relative"
        style={{ borderColor: 'rgba(226, 232, 240, 0.6)' }}
      >
        {/* Image Container */}
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative w-full h-48 bg-slate-50 overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          </div>
        </Link>

        {/* Content */}
        <div className="px-3 py-3">
          {/* Category */}
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            <bdi dir="ltr">{localizeVendor(product.vendor, safeLocale)}</bdi>
          </p>
          
          {/* Rating Stars */}
          <div className="flex items-center gap-0.5 mt-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              rating > i ? (
                <Star key={i} className="h-3.5 w-3.5 fill-[var(--primary)] text-[var(--primary)]" />
              ) : (
                <Star key={i} className="h-3.5 w-3.5 fill-slate-200 text-slate-200" />
              )
            ))}
            <span className="text-xs text-slate-500 ml-1">({rating})</span>
          </div>

        {/* Price & Add to Cart */}
        <div className="flex items-end justify-between mt-3">
          <p className="text-lg font-semibold text-[var(--primary)]">
            ${offer.toFixed(2)}{' '}
            <span className="text-slate-400 text-xs line-through font-normal">
              ${original.toFixed(2)}
            </span>
          </p>
          
          <div>
            {count === 0 ? (
              <motion.button
                className="flex items-center justify-center gap-1.5 rounded-full text-sm font-medium h-8 px-3 transition-all"
                style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)', color: 'var(--primary)', border: '1px solid rgba(220, 53, 69, 0.2)' }}
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsAdding(true);
                  try {
                    await addItem(product.id, count || 1);
                    toast.success(
                      locale === "en" ? "Added to cart!" : 
                      locale === "ps" ? "کارټ ته اضافه شو!" : "به سبد اضافه شد!"
                    );
                    setCount(0);
                  } catch (error) {
                    toast.error(
                      locale === "en" ? "Failed to add to cart" : 
                      locale === "ps" ? "کارټ ته اضافه کول ناکام شول" : "افزودن به سبد ناموفق بود"
                    );
                  } finally {
                    setIsAdding(false);
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isAdding ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent">
                    <div className="h-3 w-3.5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />
                    {count > 0 ? count : ui.add}
                  </>
                )}
              </motion.button>
            ) : (
              <div 
                className="flex items-center justify-center gap-1 h-8 px-2 rounded-full"
                style={{ backgroundColor: 'rgba(220, 53, 69, 0.15)' }}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCount((prev) => Math.max(prev - 1, 0));
                  }}
                  className="cursor-pointer text-[var(--primary)] px-2 h-full flex items-center justify-center hover:bg-white/50 rounded-full transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <span className="w-5 text-center text-sm font-medium text-[var(--primary)]">{count}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCount((prev) => prev + 1);
                  }}
                  className="cursor-pointer text-[var(--primary)] px-2 h-full flex items-center justify-center hover:bg-white/50 rounded-full transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </motion.article>
  );
}

export default function FeaturedProducts({
  products,
  viewAllLabel,
  addToCartLabel,
  eyebrow,
  title,
  description,
}: FeaturedProductsProps) {
  const locale = useLocale();
  const safeLocale = locale === "ps" || locale === "fa-AF" ? locale : "en";
  const ui = featuredUiCopy[safeLocale];
  return (
    <section className="py-20 sm:py-28">
      {/* Section Header */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between mb-12">
        <motion.div 
          className="max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.span 
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider border"
            style={{ backgroundColor: 'rgba(220, 53, 69, 0.08)', borderColor: 'rgba(220, 53, 69, 0.15)', color: 'var(--primary)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Star className="h-3.5 w-3.5" fill="currentColor" />
            {eyebrow}
          </motion.span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            {description}
          </p>
        </motion.div>

        <motion.div 
          className="flex items-center gap-4 self-start rounded-2xl border p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderColor: 'rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)', borderColor: 'rgba(220, 53, 69, 0.2)', color: 'var(--primary)' }}
          >
            <ShoppingCart className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {ui.quickCheckout}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {ui.giftReady}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Product Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {products.slice(0, 4).map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>

      {/* View All Link */}
      <motion.div 
        className="mt-10 flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href="/products"
            className="inline-flex h-14 items-center gap-2 rounded-full px-8 text-sm font-bold transition-all border"
            style={{ 
              borderColor: 'rgba(226, 232, 240, 0.8)', 
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}
          >
            {viewAllLabel}
            <Star className="h-5 w-5" strokeWidth={2} />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
