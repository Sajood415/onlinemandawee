"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingCart, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  badge: string;
};

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
  const { original, offer } = extractPrice(product.price);
  const priceDisplay = product.priceDisplay;
  const rating = 4;

  return (
    <motion.article
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 100 }}
      className="group border rounded-lg bg-white overflow-hidden"
      style={{ borderColor: 'rgba(226, 232, 240, 0.6)' }}
    >
      {/* Image Container */}
      <div className="relative w-full h-48 bg-slate-50 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {/* Category */}
        <p className="text-xs text-slate-400 uppercase tracking-wider">
          {product.vendor}
        </p>
        
        {/* Product Name */}
        <h3 className="text-slate-700 font-semibold text-base truncate mt-0.5 group-hover:text-[var(--primary)] transition-colors">
          {product.name}
        </h3>

        {/* Rating Stars */}
        <div className="flex items-center gap-0.5 mt-1.5">
          {Array(5).fill('').map((_, i) => (
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
                onClick={() => setCount(1)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />
                Add
              </motion.button>
            ) : (
              <div 
                className="flex items-center justify-center gap-1 h-8 px-2 rounded-full"
                style={{ backgroundColor: 'rgba(220, 53, 69, 0.15)' }}
              >
                <button 
                  onClick={() => setCount((prev) => Math.max(prev - 1, 0))}
                  className="cursor-pointer text-[var(--primary)] px-2 h-full flex items-center justify-center hover:bg-white/50 rounded-full transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <span className="w-5 text-center text-sm font-medium text-[var(--primary)]">{count}</span>
                <button 
                  onClick={() => setCount((prev) => prev + 1)}
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
              Quick Checkout
            </p>
            <p className="text-sm font-semibold text-slate-900">
              Gift-ready picks
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
