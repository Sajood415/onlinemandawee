"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, ShoppingCart, Heart, Star, Truck, Shield } from "lucide-react";
import { useWishlist } from "@/store/wishlist-context";
import { useCart } from "@/store/cart-context";

type Product = {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  badge: string;
};

type QuickViewModalProps = {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
};

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addItem } = useCart();

  if (!product) return null;

  const oldPrice = (product.price * 1.25).toFixed(2);
  const isLowStock = product.price > 60;

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
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Quick View</h3>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-6 p-6 lg:flex-row">
              {/* Product Image */}
              <div className="lg:w-1/2">
                <div className="relative overflow-hidden rounded-xl bg-slate-50">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={500}
                    height={500}
                    className="w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
                    🔥 Hot Deal
                  </span>
                </div>
              </div>

              {/* Product Details */}
              <div className="lg:w-1/2 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{product.name}</h2>
                  <p className="text-sm text-slate-500 font-medium">{product.vendor}</p>
                </div>

                {/* Rating and Stock */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={16} fill="currentColor" />
                    <span className="text-sm font-semibold">4.8</span>
                  </div>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">234 sold</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className={`text-xs font-semibold ${isLowStock ? "text-red-500" : "text-green-600"}`}>
                    {isLowStock ? "Low stock" : "In stock"}
                  </span>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Truck size={16} className="text-primary" />
                    <span>Free delivery on orders above $100</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Shield size={16} className="text-primary" />
                    <span>Verified vendor • Quality guaranteed</span>
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-primary">{product.priceDisplay}</p>
                    <p className="text-sm text-slate-400 line-through">${oldPrice}</p>
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                      Save 20%
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleWishlistToggle}
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-200 ${
                        isInWishlist(product.id)
                          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:bg-primary hover:text-white"
                      }`}
                    >
                      <Heart size={16} className={isInWishlist(product.id) ? "fill-current" : ""} />
                      {isInWishlist(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                    </button>
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
                    >
                      <ShoppingCart size={16} />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
